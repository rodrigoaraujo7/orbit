import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { contact } from "../db/schema.ts"
import { asUser, protectedProcedure, router } from "../trpc/init.ts"

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
    await asUser(ctx, (tx) => tx.insert(contact).values(row))
    return row
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await asUser(ctx, (tx) => tx.delete(contact).where(eq(contact.id, input.id)))
    return { ok: true }
  }),
})
