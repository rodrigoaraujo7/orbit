import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  filterInvoices,
  generateInvoices,
  invoiceListFiltersSchema,
  type InvoiceOverrides,
  type InvoiceStatus,
  type PaymentMethod,
  type Project,
  invoiceStatusSchema,
  paymentMethodSchema,
  toCents,
} from "shared"
import { contact, invoice, payment } from "../../db/schema/index.ts"
import { listProjects } from "../projects/index.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../../trpc/init/index.ts"
import type { Tx } from "../../db/with-user/index.ts"
import { recordAudit } from "../../audit/record/index.ts"

/** "YYYY-MM-DDTHH:mm", the shape the generated invoices use for `paidAt`. */
function paidAtLabel(date: Date) {
  return date.toISOString().slice(0, 16)
}

/**
 * Persisted rows keyed by id. A row whose id matches a generated invoice is the
 * status the user set by hand on it.
 */
export async function loadInvoiceOverrides(tx: Tx, projectId?: string): Promise<InvoiceOverrides> {
  const rows = await tx
    .select({
      id: invoice.id,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      paidAt: invoice.paidAt,
    })
    .from(invoice)
    .where(projectId ? eq(invoice.projectId, projectId) : undefined)
  const overrides: InvoiceOverrides = {}
  for (const row of rows) {
    overrides[row.id] = {
      status: row.status as InvoiceStatus,
      paymentMethod: (row.paymentMethod ?? undefined) as PaymentMethod | undefined,
      paidAt: row.paidAt ? paidAtLabel(row.paidAt) : undefined,
    }
  }
  return overrides
}

async function clientName(tx: Tx, clientId: string | null | undefined) {
  if (!clientId) return ""
  const [client] = await tx
    .select({ name: contact.name })
    .from(contact)
    .where(eq(contact.id, clientId))
    .limit(1)
  /* v8 ignore next -- project_contact_user_fk keeps a set client id pointing at a row */
  return client?.name ?? ""
}

/**
 * Generated invoices live only in memory until the user changes one; this
 * writes that invoice down so its new status has a row to live on.
 */
async function persistGeneratedInvoice(tx: Tx, userId: string, id: string) {
  const projects = await listProjects(tx, userId)
  const found = projects.find((row: Project) => id.startsWith(`${row.id}-invoice-`))
  const generated = found ? generateInvoices(found, "").find((row) => row.id === id) : undefined
  if (!found || !generated) throw new TRPCError({ code: "NOT_FOUND" })
  const row = {
    id,
    userId,
    projectId: found.id,
    amountCents: toCents(generated.amount),
    currency: generated.currency,
    status: generated.status,
    dueDate: generated.generatedAt,
    paymentMethod: generated.paymentMethod ?? null,
    referenceMonth: generated.referenceMonth ?? null,
    payerName: await clientName(tx, found.clientId),
    hasAttachment: generated.hasAttachment,
  }
  await tx.insert(invoice).values(row)
  return { ...row, paidAt: null }
}

const money = z.object({
  amount: z.number(),
  currency: z.string().min(1),
})

export const invoicesRouter = router({
  list: protectedProcedure.input(invoiceListFiltersSchema).query(async ({ ctx, input }) => {
    return asUser(ctx, async (tx) => {
      const projects = await listProjects(tx, ctx.userId)
      const found = projects.find((row: Project) => row.id === input.projectId)
      if (!found) return { items: [], totals: { count: 0, paid: 0, overdue: 0 } }

      const all = generateInvoices(
        found,
        await clientName(tx, found.clientId),
        await loadInvoiceOverrides(tx, found.id),
      )
      const items = filterInvoices(all, {
        status: input.status ?? "all",
        monthFrom: input.monthFrom ?? "",
        monthTo: input.monthTo ?? "",
      })
      return {
        items,
        totals: {
          count: all.length,
          paid: all.filter((row) => row.status === "paid").length,
          overdue: all.filter((row) => row.status === "overdue").length,
        },
      }
    })
  }),

  create: protectedProcedure
    .input(
      money.extend({
        projectId: z.string(),
        dueDate: z.string(),
        payerName: z.string().default(""),
        referenceMonth: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = {
        id: crypto.randomUUID(),
        userId: ctx.userId,
        projectId: input.projectId,
        amountCents: toCents(input.amount),
        currency: input.currency,
        status: "pending" as const,
        dueDate: input.dueDate,
        payerName: input.payerName,
        referenceMonth: input.referenceMonth ?? null,
        hasAttachment: false,
      }
      await asUser(ctx, async (tx) => {
        await tx.insert(invoice).values(row)
        await recordAudit(tx, auditCtx(ctx), {
          module: "project",
          action: "financial.invoice.create",
          subjectId: row.id,
          subjectLabel: `${input.amount} ${input.currency}`,
          projectId: input.projectId,
        })
      })
      return { id: row.id }
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().trim().min(1),
        status: invoiceStatusSchema,
        paymentMethod: paymentMethodSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await asUser(ctx, async (tx) => {
        const [stored] = await tx.select().from(invoice).where(eq(invoice.id, input.id)).limit(1)
        const prev = stored ?? (await persistGeneratedInvoice(tx, ctx.userId, input.id))
        const paid = input.status === "paid"
        await tx
          .update(invoice)
          .set({
            status: input.status,
            paymentMethod: paid ? (input.paymentMethod ?? prev.paymentMethod) : null,
            paidAt: paid
              ? prev.status === "paid" && prev.paidAt
                ? prev.paidAt
                : new Date()
              : null,
          })
          .where(eq(invoice.id, input.id))
        if (prev.status !== input.status) {
          await recordAudit(tx, auditCtx(ctx), {
            module: "project",
            action: "financial.invoice.status",
            subjectId: input.id,
            subjectLabel: prev.payerName || prev.id,
            projectId: prev.projectId,
            changes: [{ field: "status", from: prev.status, to: input.status }],
          })
        }
      })
      return { ok: true }
    }),
})

export const paymentsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().positive(),
        method: paymentMethodSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID()
      await asUser(ctx, async (tx) => {
        const [inv] = await tx
          .select()
          .from(invoice)
          .where(eq(invoice.id, input.invoiceId))
          .limit(1)
        await tx.insert(payment).values({
          id,
          userId: ctx.userId,
          invoiceId: input.invoiceId,
          amountCents: toCents(input.amount),
          paidAt: new Date(),
          method: input.method,
        })
        await tx
          .update(invoice)
          .set({ status: "paid", paidAt: new Date(), paymentMethod: input.method })
          .where(and(eq(invoice.id, input.invoiceId)))
        await recordAudit(tx, auditCtx(ctx), {
          module: "project",
          action: "financial.payment.create",
          subjectId: id,
          subjectLabel: `${input.amount} ${input.method}`,
          /* v8 ignore next -- payment insert is FK-bound to an existing invoice */
          projectId: inv?.projectId ?? null,
        })
      })
      return { id }
    }),
})
