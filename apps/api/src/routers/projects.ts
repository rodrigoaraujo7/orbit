import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  billingCycleSchema,
  dealKindSchema,
  fromCents,
  payerSchema,
  projectStatusSchema,
  toCents,
} from "shared"
import { credential, project, projectTool } from "../db/schema.ts"
import { asUser, protectedProcedure, router } from "../trpc/init.ts"
import { sealNewSecret } from "./credentials.ts"

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
  history: z.array(z.unknown()).optional(),
})

function rowToProject(
  row: typeof project.$inferSelect,
  tools: Array<typeof projectTool.$inferSelect & { secrets: { key: string; value: string }[] }>,
) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.contactId ?? "",
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
          url: row.repoUrl ?? "",
          workflow: row.repoWorkflow ?? "none",
        }
      : null,
    description: row.description ?? undefined,
    comments: row.comments,
    history: row.history,
  }
}

async function loadProjects(tx: Parameters<Parameters<typeof asUser>[1]>[0], userId: string) {
  const rows = await tx.select().from(project)
  const tools = await tx.select().from(projectTool)
  const secrets = await tx.select().from(credential)
  return rows.map((row) =>
    rowToProject(
      row,
      tools
        .filter((tool) => tool.projectId === row.id)
        .map((tool) => ({
          ...tool,
          secrets: secrets
            .filter((s) => s.projectToolId === tool.id)
            .map((s) => ({ key: s.label, value: "" })),
        })),
    ),
  )
}

export const projectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => asUser(ctx, (tx) => loadProjects(tx, ctx.userId))),

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
        dealCurrency: input.deal.currency ?? "BRL",
        dealInstallments: input.deal.installments ?? null,
        repoFullName: input.repo?.fullName ?? null,
        repoUrl: input.repo?.url ?? null,
        repoWorkflow: input.repo?.workflow ?? null,
        description: input.description ?? null,
        comments: input.comments ?? [],
        history: input.history ?? [],
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
    })
    return { id }
  }),

  update: protectedProcedure.input(projectInput.required({ id: true })).mutation(async ({ ctx, input }) => {
    await asUser(ctx, async (tx) => {
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
          dealCurrency: input.deal.currency ?? "BRL",
          dealInstallments: input.deal.installments ?? null,
          repoFullName: input.repo?.fullName ?? null,
          repoUrl: input.repo?.url ?? null,
          repoWorkflow: input.repo?.workflow ?? null,
          description: input.description ?? null,
          comments: input.comments ?? [],
          history: input.history ?? [],
        })
        .where(eq(project.id, input.id))

      const existingTools = await tx
        .select()
        .from(projectTool)
        .where(eq(projectTool.projectId, input.id))
      const existingSecrets = await tx.select().from(credential)
      await tx.delete(projectTool).where(eq(projectTool.projectId, input.id))
      for (const tool of input.tools) {
        const toolId = crypto.randomUUID()
        await tx.insert(projectTool).values({
          id: toolId,
          userId: ctx.userId,
          projectId: input.id,
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
            continue
          }
          const prevTool = existingTools.find((row) => row.catalogId === tool.id)
          const prev = existingSecrets.find(
            (row) => row.projectToolId === prevTool?.id && row.label === secret.key,
          )
          if (!prev) continue
          await tx.insert(credential).values({
            id: crypto.randomUUID(),
            userId: ctx.userId,
            projectToolId: toolId,
            label: prev.label,
            ciphertext: prev.ciphertext,
            iv: prev.iv,
            tag: prev.tag,
            version: prev.version,
          })
        }
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
        await tx
          .update(project)
          .set({ status: input.status, position: input.index })
          .where(eq(project.id, input.id))
      })
      return { ok: true }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await asUser(ctx, (tx) => tx.delete(project).where(and(eq(project.id, input.id))))
    return { ok: true }
  }),
})
