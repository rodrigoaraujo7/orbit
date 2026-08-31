import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { contact } from "../db/schema.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../trpc/init.ts"
import { recordAudit } from "../audit/record.ts"

const contactInput = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
})

export const contactsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    asUser(ctx, (tx) => tx.select().from(contact).orderBy(desc(contact.createdAt))),
  ),

  create: protectedProcedure.input(contactInput).mutation(async ({ ctx, input }) => {
    const row = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      company: input.company || null,
    }
    await asUser(ctx, async (tx) => {
      await tx.insert(contact).values(row)
      await recordAudit(tx, auditCtx(ctx), {
        module: "settings",
        action: "contact.create",
        subjectId: row.id,
        subjectLabel: row.name,
      })
    })
    return row
  }),

  update: protectedProcedure
    .input(contactInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(contact).where(eq(contact.id, input.id)).limit(1)
        await tx
          .update(contact)
          .set({
            name: input.name,
            email: input.email || null,
            phone: input.phone || null,
            company: input.company || null,
          })
          .where(eq(contact.id, input.id))
        if (!prev) return
        const changes = [
          { field: "name", from: prev.name, to: input.name },
          { field: "email", from: prev.email ?? "", to: input.email || "" },
          { field: "phone", from: prev.phone ?? "", to: input.phone || "" },
          { field: "company", from: prev.company ?? "", to: input.company || "" },
        ].filter((c) => c.from !== c.to)
        if (changes.length) {
          await recordAudit(tx, auditCtx(ctx), {
            module: "settings",
            action: "contact.update",
            subjectId: input.id,
            subjectLabel: input.name,
            changes,
          })
        }
      })
      return { ok: true as const }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await asUser(ctx, async (tx) => {
      const [prev] = await tx.select().from(contact).where(eq(contact.id, input.id)).limit(1)
      await tx.delete(contact).where(eq(contact.id, input.id))
      if (prev) {
        await recordAudit(tx, auditCtx(ctx), {
          module: "settings",
          action: "contact.delete",
          subjectId: input.id,
          subjectLabel: prev.name,
        })
      }
    })
    return { ok: true }
  }),
})
