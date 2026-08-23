import { eq } from "drizzle-orm"
import { z } from "zod"
import { customTool } from "../db/schema.ts"
import { asUser, protectedProcedure, router } from "../trpc/init.ts"

const input = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(1),
})

export const toolsRouter = router({
  listCustom: protectedProcedure.query(({ ctx }) =>
    asUser(ctx, (tx) => tx.select().from(customTool)),
  ),

  createCustom: protectedProcedure.input(input).mutation(async ({ ctx, input: body }) => {
    const row = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      name: body.name,
      category: body.category,
    }
    await asUser(ctx, (tx) => tx.insert(customTool).values(row))
    return row
  }),

  deleteCustom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: body }) => {
      await asUser(ctx, (tx) => tx.delete(customTool).where(eq(customTool.id, body.id)))
      return { ok: true }
    }),
})
