import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { customTool } from '../../db/schema/index.ts'
import { asUser, auditCtx, protectedProcedure, router } from '../../trpc/init/index.ts'
import { recordAudit } from '../../audit/record/index.ts'

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
    await asUser(ctx, async (tx) => {
      await tx.insert(customTool).values(row)
      await recordAudit(tx, auditCtx(ctx), {
        module: 'settings',
        action: 'tools.custom.create',
        subjectId: row.id,
        subjectLabel: row.name,
      })
    })
    return row
  }),

  updateCustom: protectedProcedure
    .input(input.extend({ id: z.string() }))
    .mutation(async ({ ctx, input: body }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(customTool).where(eq(customTool.id, body.id)).limit(1)
        await tx
          .update(customTool)
          .set({ name: body.name, category: body.category })
          .where(eq(customTool.id, body.id))
        if (!prev) return
        const changes = [
          { field: 'name', from: prev.name, to: body.name },
          { field: 'category', from: prev.category, to: body.category },
        ].filter((c) => c.from !== c.to)
        if (changes.length) {
          await recordAudit(tx, auditCtx(ctx), {
            module: 'settings',
            action: 'tools.custom.update',
            subjectId: body.id,
            subjectLabel: body.name,
            changes,
          })
        }
      })
      return { ok: true as const }
    }),

  deleteCustom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: body }) => {
      await asUser(ctx, async (tx) => {
        const [prev] = await tx.select().from(customTool).where(eq(customTool.id, body.id)).limit(1)
        await tx.delete(customTool).where(eq(customTool.id, body.id))
        if (prev) {
          await recordAudit(tx, auditCtx(ctx), {
            module: 'settings',
            action: 'tools.custom.delete',
            subjectId: body.id,
            subjectLabel: prev.name,
          })
        }
      })
      return { ok: true }
    }),
})
