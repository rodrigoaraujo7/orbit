import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  filterInvoices,
  generateInvoices,
  invoiceListFiltersSchema,
  type Project,
  invoiceStatusSchema,
  paymentMethodSchema,
  toCents,
} from "shared"
import { contact, invoice, payment } from "../../db/schema/index.ts"
import { listProjects } from "../projects/index.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../../trpc/init/index.ts"
import { recordAudit } from "../../audit/record/index.ts"

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

      const [client] = found.clientId
        ? await tx
            .select({ name: contact.name })
            .from(contact)
            .where(eq(contact.id, found.clientId))
            .limit(1)
        : []
      const all = generateInvoices(found, client?.name ?? "")
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
        id: z.string(),
        status: invoiceStatusSchema,
        paymentMethod: paymentMethodSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(invoice).where(eq(invoice.id, input.id)).limit(1)
        await tx
          .update(invoice)
          .set({
            status: input.status,
            paymentMethod: input.paymentMethod ?? null,
            paidAt: input.status === "paid" ? new Date() : null,
          })
          .where(eq(invoice.id, input.id))
        if (prev && prev.status !== input.status) {
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
