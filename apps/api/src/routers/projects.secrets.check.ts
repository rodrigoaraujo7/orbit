/**
 * Project update must reinsert ciphertext under the same credential id
 * or AES-GCM AAD (userId:id:version) will not open.
 * Run: pnpm --filter api check:crypto
 */
import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { openSecret, parseMasterKey, secretAad, unwrapDek } from "../crypto/envelope.ts"
import { credential, project, projectTool, userKey } from "../db/schema.ts"
import { createTestDb, insertUser } from "../db/test-db.ts"
import { withUser } from "../db/with-user.ts"
import { sealNewSecret } from "./credentials.ts"
import { replaceProjectTools } from "./projects.ts"

process.env.MASTER_KEY = randomBytes(32).toString("hex")

const assert = {
  equal(actual: unknown, expected: unknown, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} expected ${String(expected)}, got ${String(actual)}`)
    }
  },
}

const { db, client } = await createTestDb()
await insertUser(client, "user-a")

const credId = await withUser(db, "user-a", async (tx) => {
  await tx.insert(project).values({
    id: "p1",
    userId: "user-a",
    name: "Secret project",
    status: "queued",
    position: 0,
    startedAt: "2026-01-01",
    dealKind: "upfront",
    dealAmountCents: 0n,
    dealCurrency: "BRL",
  })
  await tx.insert(projectTool).values({
    id: "t1",
    userId: "user-a",
    projectId: "p1",
    catalogId: "aws",
    name: "AWS",
    category: "infra",
  })
  return sealNewSecret(tx, "user-a", "t1", "api-key", "sk_live_abc")
})

await withUser(db, "user-a", (tx) =>
  replaceProjectTools(tx, "user-a", "p1", [
    {
      id: "aws",
      name: "AWS",
      category: "infra",
      secrets: [{ key: "api-key", value: "" }],
    },
  ]),
)

const [row] = await withUser(db, "user-a", (tx) => tx.select().from(credential))
assert.equal(row?.id, credId, "credential id must survive an empty-value update")

const [key] = await withUser(db, "user-a", (tx) =>
  tx.select().from(userKey).where(eq(userKey.userId, "user-a")),
)
const dek = unwrapDek(parseMasterKey(process.env.MASTER_KEY), {
  ciphertext: key.wrappedDek,
  iv: key.iv,
  tag: key.tag,
})
assert.equal(
  openSecret(dek, { ciphertext: row.ciphertext, iv: row.iv, tag: row.tag }, secretAad("user-a", row.id, row.version)),
  "sk_live_abc",
  "ciphertext must open under the original AAD",
)

await client.close()
console.log("projects.secrets.check.ts: ok")
