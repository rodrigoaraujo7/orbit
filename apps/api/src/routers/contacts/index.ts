import { desc, eq } from "drizzle-orm"
import { contact } from "../../db/schema/index.ts"
import { contactIdInput, contactInput, contactUpdateInput } from "../../input/contact.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../../trpc/init/index.ts"
import { recordAudit } from "../../audit/record/index.ts"

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

  update: protectedProcedure.input(contactUpdateInput).mutation(async ({ ctx, input }) => {
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

  delete: protectedProcedure.input(contactIdInput).mutation(async ({ ctx, input }) => {
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
