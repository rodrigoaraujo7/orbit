import { and, eq, gte, ilike, lte, or } from 'drizzle-orm'
import { z } from 'zod'
import {
  billingCycleSchema,
  dealKindSchema,
  fromCents,
  lastDayOfMonth,
  payerSchema,
  projectListFiltersSchema,
  projectStatusSchema,
  toCents,
  type ProjectListFilters,
} from 'shared'
import { contact, credential, project, projectTool } from '../../db/schema/index.ts'
import type { Tx } from '../../db/with-user/index.ts'
import { asUser, auditCtx, protectedProcedure, router } from '../../trpc/init/index.ts'
import { diffProject, type ProjectDiffInput } from '../../audit/diff/index.ts'
import { recordAudit } from '../../audit/record/index.ts'
import { sealNewSecret } from '../credentials/index.ts'

const toolInput = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  account: z.string().optional(),
  billing: z
    .object({
      amount: z.number(),
      cycle: billingCycleSchema,
      nextInvoice: z.string(),
      payer: payerSchema,
      currency: z.string().optional(),
    })
    .optional(),
  secrets: z.array(z.object({ key: z.string(), value: z.string() })),
})

const projectInput = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  clientId: z.string(),
  status: projectStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  deal: z.object({
    kind: dealKindSchema,
    amount: z.number(),
    installments: z.number().optional(),
    currency: z.string().optional(),
  }),
  tools: z.array(toolInput),
  repo: z
    .object({
      fullName: z.string(),
      url: z.string(),
      workflow: z.string(),
    })
    .nullable(),
  description: z.string().optional(),
  comments: z.array(z.unknown()).optional(),
})

function rowToProject(
  row: typeof project.$inferSelect,
  tools: Array<typeof projectTool.$inferSelect & { secrets: { key: string; value: string }[] }>,
) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.contactId ?? '',
    status: row.status,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? undefined,
    deal: {
      kind: row.dealKind,
      amount: fromCents(row.dealAmountCents),
      installments: row.dealInstallments ?? undefined,
      currency: row.dealCurrency,
    },
    tools: tools.map((tool) => ({
      id: tool.catalogId,
      name: tool.name,
      category: tool.category,
      account: tool.account ?? undefined,
      billing:
        tool.amountCents != null
          ? {
              amount: fromCents(tool.amountCents),
              cycle: tool.cycle,
              nextInvoice: tool.nextInvoice,
              payer: tool.payer,
              currency: tool.currency ?? undefined,
            }
          : undefined,
      secrets: tool.secrets,
    })),
    repo: row.repoFullName
      ? {
          fullName: row.repoFullName,
          url: row.repoUrl ?? '',
          workflow: row.repoWorkflow ?? 'none',
        }
      : null,
    description: row.description ?? undefined,
    comments: row.comments,
  }
}

function escapeIlike(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

export async function listProjects(tx: Tx, _userId: string, filters?: ProjectListFilters) {
  const conditions = []
  if (filters?.status) conditions.push(eq(project.status, filters.status))
  if (filters?.workflow) conditions.push(eq(project.repoWorkflow, filters.workflow))
  if (filters?.clientId) conditions.push(eq(project.contactId, filters.clientId))
  if (filters?.monthFrom) conditions.push(gte(project.startedAt, `${filters.monthFrom}-01`))
  if (filters?.monthTo) conditions.push(lte(project.startedAt, lastDayOfMonth(filters.monthTo)))
  if (filters?.q) {
    const q = `%${escapeIlike(filters.q)}%`
    conditions.push(or(ilike(project.name, q), ilike(contact.name, q)))
  }

  const where = conditions.length ? and(...conditions) : undefined
  const rows = filters?.q
    ? (
        await tx
          .select({ project })
          .from(project)
          .leftJoin(contact, eq(project.contactId, contact.id))
          .where(where)
      ).map((row: { project: typeof project.$inferSelect }) => row.project)
    : await tx.select().from(project).where(where)

  const tools = await tx.select().from(projectTool)
  const secrets = await tx.select().from(credential)
  return rows.map((row: typeof project.$inferSelect) =>
    rowToProject(
      row,
      tools
        .filter((tool: typeof projectTool.$inferSelect) => tool.projectId === row.id)
        .map((tool: typeof projectTool.$inferSelect) => ({
          ...tool,
          secrets: secrets
            .filter((s: typeof credential.$inferSelect) => s.projectToolId === tool.id)
            .map((s: typeof credential.$inferSelect) => ({ key: s.label, value: '' })),
        })),
    ),
  )
}

export async function replaceProjectTools(
  tx: Tx,
  userId: string,
  projectId: string,
  tools: z.infer<typeof toolInput>[],
) {
  const existingTools = await tx
    .select()
    .from(projectTool)
    .where(eq(projectTool.projectId, projectId))
  const existingSecrets = await tx.select().from(credential)
  await tx.delete(projectTool).where(eq(projectTool.projectId, projectId))
  for (const tool of tools) {
    const toolId = crypto.randomUUID()
    await tx.insert(projectTool).values({
      id: toolId,
      userId,
      projectId,
      catalogId: tool.id,
      name: tool.name,
      category: tool.category,
      account: tool.account ?? null,
      amountCents: tool.billing ? toCents(tool.billing.amount) : null,
      currency: tool.billing?.currency ?? null,
      cycle: tool.billing?.cycle ?? null,
      nextInvoice: tool.billing?.nextInvoice ?? null,
      payer: tool.billing?.payer ?? null,
    })
    for (const secret of tool.secrets) {
      if (secret.value) {
        await sealNewSecret(tx, userId, toolId, secret.key, secret.value)
        continue
      }
      const prevTool = existingTools.find(
        (row: typeof projectTool.$inferSelect) => row.catalogId === tool.id,
      )
      const prev = existingSecrets.find(
        (row: typeof credential.$inferSelect) =>
          row.projectToolId === prevTool?.id && row.label === secret.key,
      )
      if (!prev) continue
      await tx.insert(credential).values({
        id: prev.id,
        userId,
        projectToolId: toolId,
        label: prev.label,
        ciphertext: prev.ciphertext,
        iv: prev.iv,
        tag: prev.tag,
        version: prev.version,
      })
    }
  }
}

function inputToDiff(input: z.infer<typeof projectInput>): ProjectDiffInput {
  return {
    name: input.name,
    clientId: input.clientId,
    status: input.status,
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? null,
    deal: input.deal,
    repo: input.repo ? { fullName: input.repo.fullName } : null,
    description: input.description,
    comments: input.comments,
    tools: input.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      account: tool.account,
      billing: tool.billing ?? null,
      secrets: tool.secrets,
    })),
  }
}

function rowToDiff(
  row: typeof project.$inferSelect,
  tools: Array<typeof projectTool.$inferSelect & { secrets: { key: string }[] }>,
): ProjectDiffInput {
  return {
    name: row.name,
    clientId: row.contactId ?? '',
    status: row.status,
    startedAt: String(row.startedAt),
    endedAt: row.endedAt ? String(row.endedAt) : null,
    deal: {
      kind: row.dealKind,
      amount: fromCents(row.dealAmountCents),
      installments: row.dealInstallments,
      currency: row.dealCurrency,
    },
    repo: row.repoFullName ? { fullName: row.repoFullName } : null,
    description: row.description,
    comments: row.comments,
    tools: tools.map((tool) => ({
      id: tool.catalogId,
      name: tool.name,
      account: tool.account,
      billing:
        tool.amountCents != null
          ? {
              amount: fromCents(tool.amountCents),
              cycle: tool.cycle ?? '',
              nextInvoice: tool.nextInvoice ?? '',
              payer: tool.payer ?? '',
              currency: tool.currency ?? undefined,
            }
          : null,
      secrets: tool.secrets,
    })),
  }
}

async function loadToolsForDiff(tx: Tx, projectId: string) {
  const tools = await tx.select().from(projectTool).where(eq(projectTool.projectId, projectId))
  const secrets = await tx.select().from(credential)
  return tools.map((tool: typeof projectTool.$inferSelect) => ({
    ...tool,
    secrets: secrets
      .filter((s: typeof credential.$inferSelect) => s.projectToolId === tool.id)
      .map((s: typeof credential.$inferSelect) => ({ key: s.label })),
  }))
}

export const projectsRouter = router({
  list: protectedProcedure
    .input(projectListFiltersSchema.optional())
    .query(({ ctx, input }) => asUser(ctx, (tx) => listProjects(tx, ctx.userId, input))),

  create: protectedProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
    const id = input.id ?? crypto.randomUUID()
    await asUser(ctx, async (tx) => {
      await tx.insert(project).values({
        id,
        userId: ctx.userId,
        name: input.name,
        status: input.status,
        position: 0,
        contactId: input.clientId || null,
        startedAt: input.startedAt,
        endedAt: input.endedAt ?? null,
        dealKind: input.deal.kind,
        dealAmountCents: toCents(input.deal.amount),
        dealCurrency: input.deal.currency ?? 'BRL',
        dealInstallments: input.deal.installments ?? null,
        repoFullName: input.repo?.fullName ?? null,
        repoUrl: input.repo?.url ?? null,
        repoWorkflow: input.repo?.workflow ?? null,
        description: input.description ?? null,
        comments: input.comments ?? [],
      })
      for (const tool of input.tools) {
        const toolId = crypto.randomUUID()
        await tx.insert(projectTool).values({
          id: toolId,
          userId: ctx.userId,
          projectId: id,
          catalogId: tool.id,
          name: tool.name,
          category: tool.category,
          account: tool.account ?? null,
          amountCents: tool.billing ? toCents(tool.billing.amount) : null,
          currency: tool.billing?.currency ?? null,
          cycle: tool.billing?.cycle ?? null,
          nextInvoice: tool.billing?.nextInvoice ?? null,
          payer: tool.billing?.payer ?? null,
        })
        for (const secret of tool.secrets) {
          if (secret.value) {
            await sealNewSecret(tx, ctx.userId, toolId, secret.key, secret.value)
          }
        }
      }
      await recordAudit(tx, auditCtx(ctx), {
        module: 'project',
        action: 'project.create',
        subjectId: id,
        subjectLabel: input.name,
        projectId: id,
      })
    })
    return { id }
  }),

  update: protectedProcedure
    .input(projectInput.required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(project).where(eq(project.id, input.id)).limit(1)
        if (!prev) return
        const prevTools = await loadToolsForDiff(tx, input.id)

        await tx
          .update(project)
          .set({
            name: input.name,
            status: input.status,
            contactId: input.clientId || null,
            startedAt: input.startedAt,
            endedAt: input.endedAt ?? null,
            dealKind: input.deal.kind,
            dealAmountCents: toCents(input.deal.amount),
            dealCurrency: input.deal.currency ?? 'BRL',
            dealInstallments: input.deal.installments ?? null,
            repoFullName: input.repo?.fullName ?? null,
            repoUrl: input.repo?.url ?? null,
            repoWorkflow: input.repo?.workflow ?? null,
            description: input.description ?? null,
            comments: input.comments ?? [],
          })
          .where(eq(project.id, input.id))

        await replaceProjectTools(tx, ctx.userId, input.id, input.tools)

        for (const entry of diffProject(rowToDiff(prev, prevTools), inputToDiff(input))) {
          await recordAudit(tx, auditCtx(ctx), {
            ...entry,
            subjectId: input.id,
            subjectLabel: input.name,
            projectId: input.id,
          })
        }
      })
      return { ok: true }
    }),

  move: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: projectStatusSchema,
        index: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(project).where(eq(project.id, input.id)).limit(1)
        await tx
          .update(project)
          .set({ status: input.status, position: input.index })
          .where(eq(project.id, input.id))
        if (prev && prev.status !== input.status) {
          await recordAudit(tx, auditCtx(ctx), {
            module: 'kanban',
            action: 'kanban.move',
            subjectId: input.id,
            subjectLabel: prev.name,
            projectId: input.id,
            changes: [{ field: 'status', from: prev.status, to: input.status }],
          })
        }
      })
      return { ok: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(project).where(eq(project.id, input.id)).limit(1)
        await tx.delete(project).where(and(eq(project.id, input.id)))
        if (prev) {
          await recordAudit(tx, auditCtx(ctx), {
            module: 'project',
            action: 'project.delete',
            subjectId: input.id,
            subjectLabel: prev.name,
            projectId: input.id,
          })
        }
      })
      return { ok: true }
    }),
})
