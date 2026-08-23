/**
 * Isolation: user B cannot read or write user A's rows, including via SQL.
 * Run: pnpm --filter api check:isolation
 */
import { eq, sql } from "drizzle-orm"
import { contact } from "./schema.ts"
import { createTestDb, insertUser } from "./test-db.ts"
import { withUser } from "./with-user.ts"

const assert = {
  equal(actual: unknown, expected: unknown, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} expected ${String(expected)}, got ${String(actual)}`)
    }
  },
}

const { db, client } = await createTestDb()
await insertUser(client, "user-a")
await insertUser(client, "user-b")

await withUser(db, "user-a", async (tx) => {
  await tx.insert(contact).values({
    id: "c-a",
    userId: "user-a",
    name: "Alice Contact",
  })
})

const asB = await withUser(db, "user-b", async (tx) =>
  tx.select().from(contact),
)
assert.equal(asB.length, 0, "list as B")

const stolen = await withUser(db, "user-b", async (tx) =>
  tx.select().from(contact).where(eq(contact.id, "c-a")),
)
assert.equal(stolen.length, 0, "id lookup as B")

const raw = await withUser(db, "user-b", async (tx) =>
  tx.execute(sql`select id from contact where user_id = 'user-a'`),
)
assert.equal((raw as { rows?: unknown[] }).rows?.length ?? (raw as unknown[]).length, 0, "raw sql")

let insertCrossTenantFailed = false
try {
  await withUser(db, "user-b", async (tx) => {
    await tx.insert(contact).values({
      id: "c-fake",
      userId: "user-a",
      name: "Forged",
    })
  })
} catch {
  insertCrossTenantFailed = true
}
assert.equal(insertCrossTenantFailed, true, "insert as B with A's user_id")

const asA = await withUser(db, "user-a", async (tx) =>
  tx.select().from(contact),
)
assert.equal(asA.length, 1, "list as A")
assert.equal(asA[0]?.name, "Alice Contact")

await client.close()
console.log("isolation.check.ts: ok")
