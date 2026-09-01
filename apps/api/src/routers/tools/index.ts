import { eq } from "drizzle-orm"
import { customTool } from "../../db/schema/index.ts"
import {
  customToolIdInput,
  customToolInput,
  customToolUpdateInput,
} from "../../input/custom-tool.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../../trpc/init/index.ts"
import { recordAudit } from "../../audit/record/index.ts"

export const toolsRouter = router({
  listCustom: protectedProcedure.query(({ ctx }) =>
    asUser(ctx, (tx) => tx.select().from(customTool)),
  ),

  createCustom: protectedProcedure.input(customToolInput).mutation(async ({ ctx, input: body }) => {
    const row = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      name: body.name,
      category: body.category,
    }
    await asUser(ctx, async (tx) => {
      await tx.insert(customTool).values(row)
      await recordAudit(tx, auditCtx(ctx), {
        module: "settings",
        action: "tools.custom.create",
        subjectId: row.id,
        subjectLabel: row.name,
      })
    })
    return row
  }),

  updateCustom: protectedProcedure.input(customToolUpdateInput).mutation(async ({ ctx, input: body }) => {
    await asUser(ctx, async (tx) => {
      const [prev] = await tx.select().from(customTool).where(eq(customTool.id, body.id)).limit(1)
      await tx
        .update(customTool)
        .set({ name: body.name, category: body.category })
        .where(eq(customTool.id, body.id))
      if (!prev) return
      const changes = [
        { field: "name", from: prev.name, to: body.name },
        { field: "category", from: prev.category, to: body.category },
      ].filter((c) => c.from !== c.to)
      if (changes.length) {
        await recordAudit(tx, auditCtx(ctx), {
          module: "settings",
          action: "tools.custom.update",
          subjectId: body.id,
          subjectLabel: body.name,
          changes,
        })
      }
    })
    return { ok: true as const }
  }),

  deleteCustom: protectedProcedure.input(customToolIdInput).mutation(async ({ ctx, input: body }) => {
    await asUser(ctx, async (tx) => {
      const [prev] = await tx.select().from(customTool).where(eq(customTool.id, body.id)).limit(1)
      await tx.delete(customTool).where(eq(customTool.id, body.id))
      if (prev) {
        await recordAudit(tx, auditCtx(ctx), {
          module: "settings",
          action: "tools.custom.delete",
          subjectId: body.id,
          subjectLabel: prev.name,
        })
      }
    })
    return { ok: true }
  }),
})
