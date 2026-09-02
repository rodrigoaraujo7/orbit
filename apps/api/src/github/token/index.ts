/** Storage for the per-user GitHub PAT. */
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
  }
}

export async function saveGithubToken(tx: Tx, userId: string, token: string, login: string | null) {
  const dek = await dekFor(tx, userId)
  const sealed = sealSecret(dek, token, secretAad(userId, AAD_SUBJECT, 1))
  const values = {
    userId,
    login,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
    version: 1,
  }
  await tx.insert(githubToken).values(values).onConflictDoUpdate({
    target: githubToken.userId,
    set: values,
  })
}

export async function deleteGithubToken(tx: Tx, userId: string) {
  await tx.delete(githubToken).where(eq(githubToken.userId, userId))
}
