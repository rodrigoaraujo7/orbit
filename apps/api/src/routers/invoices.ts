import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { fromCents, invoiceStatusSchema, paymentMethodSchema, toCents } from "shared"
import { invoice, payment } from "../db/schema.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../trpc/init.ts"
import { recordAudit } from "../audit/record.ts"

const money = z.object({
  amount: z.number(),
  currency: z.string().min(1),
})

export const invoicesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await asUser(ctx, (tx) => {
        if (input?.projectId) {
          return tx.select().from(invoice).where(eq(invoice.projectId, input.projectId))
        }
        return tx.select().from(invoice)
      })
      return rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        amount: fromCents(row.amountCents),
        currency: row.currency,
        status: row.status,
        dueDate: row.dueDate,
        paidAt: row.paidAt?.toISOString() ?? null,
        paymentMethod: row.paymentMethod,
        referenceMonth: row.referenceMonth,
        payerName: row.payerName,
        hasAttachment: row.hasAttachment,
        generatedAt: row.dueDate,
      }))
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
        const [inv] = await tx.select().from(invoice).where(eq(invoice.id, input.invoiceId)).limit(1)
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
          projectId: inv?.projectId ?? null,
        })
      })
      return { id }
    }),
})
