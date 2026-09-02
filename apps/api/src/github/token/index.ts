/** Storage for the per-user GitHub PAT and its webhook credentials. */
import { randomBytes, randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { dekFor } from "../../crypto/dek/index.ts"
import { openSecret, sealSecret, secretAad } from "../../crypto/envelope/index.ts"
import { githubToken } from "../../db/schema/index.ts"
import type { Tx } from "../../db/with-user/index.ts"

/** There is one token per user, so the AAD subject is a constant rather than a row id. */
const AAD_SUBJECT = "github_token"

export type StoredGithubToken = {
  userId: string
  token: string
  login: string | null
  hookId: string
  hookSecret: string
}

function open(row: typeof githubToken.$inferSelect, dek: Buffer) {
  return openSecret(
    dek,
    { ciphertext: row.ciphertext, iv: row.iv, tag: row.tag },
    secretAad(row.userId, AAD_SUBJECT, row.version),
  )
}

export async function readGithubToken(tx: Tx, userId: string): Promise<StoredGithubToken | null> {
  const [row] = await tx.select().from(githubToken).where(eq(githubToken.userId, userId)).limit(1)
  if (!row) return null
  const dek = await dekFor(tx, userId)
  return {
    userId: row.userId,
    token: open(row, dek),
    login: row.login,
    hookId: row.hookId,
    hookSecret: row.hookSecret,
  }
}

/** Webhook deliveries carry no session — the hook id in the URL is the only routing key. */
export async function readGithubTokenByHook(
  tx: Tx,
  hookId: string,
): Promise<StoredGithubToken | null> {
  const [row] = await tx.select().from(githubToken).where(eq(githubToken.hookId, hookId)).limit(1)
  if (!row) return null
  const dek = await dekFor(tx, row.userId)
  return {
    userId: row.userId,
    token: open(row, dek),
    login: row.login,
    hookId: row.hookId,
    hookSecret: row.hookSecret,
  }
}

/**
 * Reconnecting keeps the existing hook id and secret so a webhook already
 * registered on GitHub keeps working after the token is rotated.
 */
export async function saveGithubToken(tx: Tx, userId: string, token: string, login: string | null) {
  const [existing] = await tx
    .select()
    .from(githubToken)
    .where(eq(githubToken.userId, userId))
    .limit(1)
  const hookId = existing?.hookId ?? randomUUID()
  const hookSecret = existing?.hookSecret ?? randomBytes(24).toString("hex")
  const dek = await dekFor(tx, userId)
  const sealed = sealSecret(dek, token, secretAad(userId, AAD_SUBJECT, 1))
  const values = {
    userId,
    login,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
    version: 1,
    hookId,
    hookSecret,
  }
  await tx.insert(githubToken).values(values).onConflictDoUpdate({
    target: githubToken.userId,
    set: values,
  })
  return { hookId, hookSecret }
}

export async function deleteGithubToken(tx: Tx, userId: string) {
  await tx.delete(githubToken).where(eq(githubToken.userId, userId))
}
