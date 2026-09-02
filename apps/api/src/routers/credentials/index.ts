import { and, count, eq, gte } from "drizzle-orm"
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { auditLog, credential } from "../../db/schema/index.ts"
import { dekFor } from "../../crypto/dek/index.ts"
import { openSecret, sealSecret, secretAad } from "../../crypto/envelope/index.ts"
import { asUser, auditCtx, protectedProcedure, router } from "../../trpc/init/index.ts"
import { recordAudit } from "../../audit/record/index.ts"
import { validation } from "../../input/messages.ts"
import type { Tx } from "../../db/with-user/index.ts"

const REVEAL_LIMIT = 10
const REVEAL_WINDOW_MS = 60 * 60 * 1000
const REVEAL_ATTEMPT = "credential.reveal.attempt"

export async function sealNewSecret(
  tx: Tx,
  userId: string,
  projectToolId: string,
  label: string,
  value: string,
) {
  const id = crypto.randomUUID()
  const dek = await dekFor(tx, userId)
  const sealed = sealSecret(dek, value, secretAad(userId, id, 1))
  await tx.insert(credential).values({
    id,
    userId,
    projectToolId,
    label,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
    version: 1,
  })
  return id
}

export async function recordRevealAttempt(
  tx: Tx,
  userId: string,
  subjectId: string,
  ip?: string | null,
  userAgent?: string | null,
) {
  await recordAudit(
    tx,
    { userId, ip, userAgent },
    {
      module: "security",
      action: REVEAL_ATTEMPT,
      subjectId,
    },
  )
}

export async function revealAttemptCount(tx: Tx, userId: string, now = new Date()) {
  const since = new Date(now.getTime() - REVEAL_WINDOW_MS)
  const [row] = await tx
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, userId),
        eq(auditLog.action, REVEAL_ATTEMPT),
        gte(auditLog.createdAt, since),
      ),
    )
  /* v8 ignore next -- drizzle `count()` always returns a row */
  return Number(row?.n ?? 0)
}

export const credentialsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectToolId: z.string() }))
    .query(async ({ ctx, input }) => {
      return asUser(ctx, async (tx) => {
        const rows = await tx
          .select()
          .from(credential)
          .where(eq(credential.projectToolId, input.projectToolId))
        return rows.map((row: typeof credential.$inferSelect) => ({
          id: row.id,
          projectToolId: row.projectToolId,
          label: row.label,
          version: row.version,
        }))
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectToolId: z.string(),
        label: z.string().trim().min(1),
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = await asUser(ctx, (tx) =>
        sealNewSecret(tx, ctx.userId, input.projectToolId, input.label, input.value),
      )
      return { id, label: input.label }
    }),

  reveal: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return asUser(ctx, async (tx) => {
        await recordRevealAttempt(
          tx,
          ctx.userId,
          input.id,
          ctx.req.headers.get("x-forwarded-for"),
          ctx.req.headers.get("user-agent"),
        )
        if ((await revealAttemptCount(tx, ctx.userId)) > REVEAL_LIMIT) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
        }

        const [row] = await tx.select().from(credential).where(eq(credential.id, input.id)).limit(1)
        if (!row) throw new TRPCError({ code: "NOT_FOUND" })
        const dek = await dekFor(tx, ctx.userId)
        const value = openSecret(
          dek,
          { ciphertext: row.ciphertext, iv: row.iv, tag: row.tag },
          secretAad(ctx.userId, row.id, row.version),
        )
        await recordAudit(tx, auditCtx(ctx), {
          module: "security",
          action: "credential.reveal",
          subjectId: row.id,
          subjectLabel: row.label,
        })
        return { id: row.id, label: row.label, value }
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().trim().min(1),
        label: z.string(validation.enterKey).trim().min(1, validation.enterKey),
        value: z.string(validation.enterValue).trim().min(1, validation.enterValue),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return asUser(ctx, async (tx) => {
        const [row] = await tx.select().from(credential).where(eq(credential.id, input.id)).limit(1)
        if (!row) throw new TRPCError({ code: "NOT_FOUND" })
        const version = row.version + 1
        const dek = await dekFor(tx, ctx.userId)
        const sealed = sealSecret(dek, input.value, secretAad(ctx.userId, row.id, version))
        await tx
          .update(credential)
          .set({
            label: input.label,
            ciphertext: sealed.ciphertext,
            iv: sealed.iv,
            tag: sealed.tag,
            version,
          })
          .where(eq(credential.id, input.id))
        await recordAudit(tx, auditCtx(ctx), {
          module: "security",
          action: "credential.update",
          subjectId: row.id,
          subjectLabel: input.label,
        })
        return { id: row.id, label: input.label }
      })
    }),
})
