/** Per-user data encryption key: created on first use, wrapped by MASTER_KEY. */
import { eq } from "drizzle-orm"
import { userKey } from "../../db/schema/index.ts"
import type { Tx } from "../../db/with-user/index.ts"
import { env } from "../../env/index.ts"
import { generateDek, parseMasterKey, unwrapDek, wrapDek } from "../envelope/index.ts"

export function masterKey() {
  return parseMasterKey(env("MASTER_KEY"))
}

export async function dekFor(tx: Tx, userId: string) {
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
