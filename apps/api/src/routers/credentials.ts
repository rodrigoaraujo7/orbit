import { eq } from "drizzle-orm"
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { auditLog, credential, userKey } from "../db/schema.ts"
import {
  generateDek,
  openSecret,
  parseMasterKey,
  sealSecret,
  secretAad,
  unwrapDek,
  wrapDek,
} from "../crypto/envelope.ts"
import { allowAttempt } from "../crypto/rate-limit.ts"
import { env } from "../env.ts"
import { asUser, protectedProcedure, router } from "../trpc/init.ts"
import type { Tx } from "../db/with-user.ts"

function masterKey() {
  return parseMasterKey(env("MASTER_KEY"))
}

async function dekFor(tx: Tx, userId: string) {
  const [existing] = await tx.select().from(userKey).where(eq(userKey.userId, userId)).limit(1)
  const master = masterKey()
  if (existing) {
    return unwrapDek(master, {
      ciphertext: existing.wrappedDek,
      iv: existing.iv,
      tag: existing.tag,
    })
  }
  const dek = generateDek()
  const wrapped = wrapDek(master, dek)
  await tx.insert(userKey).values({
    userId,
    wrappedDek: wrapped.ciphertext,
    iv: wrapped.iv,
    tag: wrapped.tag,
    masterKeyVersion: 1,
  })
  return dek
}

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

export const credentialsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectToolId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await asUser(ctx, (tx) =>
        tx.select().from(credential).where(eq(credential.projectToolId, input.projectToolId)),
      )
      return rows.map((row) => ({
        id: row.id,
        projectToolId: row.projectToolId,
        label: row.label,
        version: row.version,
      }))
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
      if (!ctx.user.twoFactorEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "2FA is required to reveal secrets",
        })
      }
      const issuedAt = ctx.session?.session.createdAt
      const ageMs = issuedAt ? Date.now() - new Date(issuedAt).getTime() : Infinity
      if (ageMs > 15 * 60 * 1000) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Reauthenticate to reveal secrets",
        })
      }
      if (!allowAttempt(`reveal:${ctx.userId}`, 10, 60 * 60 * 1000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
      }

      return asUser(ctx, async (tx) => {
        const [row] = await tx.select().from(credential).where(eq(credential.id, input.id)).limit(1)
        if (!row) throw new TRPCError({ code: "NOT_FOUND" })
        const dek = await dekFor(tx, ctx.userId)
        const value = openSecret(
          dek,
          { ciphertext: row.ciphertext, iv: row.iv, tag: row.tag },
          secretAad(ctx.userId, row.id, row.version),
        )
        await tx.insert(auditLog).values({
          id: crypto.randomUUID(),
          userId: ctx.userId,
          action: "credential.reveal",
          subjectId: row.id,
          ip: ctx.req.headers.get("x-forwarded-for"),
          userAgent: ctx.req.headers.get("user-agent"),
        })
        return { id: row.id, label: row.label, value }
      })
    }),
})
