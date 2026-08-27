/**
 * Isolation: user B cannot read or write user A's rows, including via SQL.
 * Run: pnpm --filter api check:isolation
 */
import { eq, sql } from "drizzle-orm"
import { contact, customTool, invoice, project, projectTool } from "./schema.ts"
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

await client.query(
  `insert into two_factor (id, secret, backup_codes, user_id) values ('tf-a', 'totp-secret', '[]', 'user-a')`,
)
let authTableDenied = false
try {
  await withUser(db, "user-b", async (tx) => tx.execute(sql`select secret from two_factor`))
} catch {
  authTableDenied = true
}
assert.equal(authTableDenied, true, "app_runtime cannot read two_factor")

await withUser(db, "user-a", async (tx) => {
  await tx.insert(project).values({
    id: "p-a",
    userId: "user-a",
    name: "Alice Project",
    status: "queued",
    position: 0,
    startedAt: "2026-01-01",
    dealKind: "upfront",
    dealAmountCents: 0n,
    dealCurrency: "BRL",
  })
})

let stealInvoiceFailed = false
try {
  await withUser(db, "user-b", async (tx) => {
    await tx.insert(invoice).values({
      id: "inv-steal",
      userId: "user-b",
      projectId: "p-a",
      amountCents: 100n,
      currency: "BRL",
      status: "pending",
      dueDate: "2026-02-01",
    })
  })
} catch {
  stealInvoiceFailed = true
}
assert.equal(stealInvoiceFailed, true, "invoice cannot point at another tenant's project")

let stealToolFailed = false
try {
  await withUser(db, "user-b", async (tx) => {
    await tx.insert(projectTool).values({
      id: "tool-steal",
      userId: "user-b",
      projectId: "p-a",
      catalogId: "aws",
      name: "AWS",
      category: "infra",
    })
  })
} catch {
  stealToolFailed = true
}
assert.equal(stealToolFailed, true, "project_tool cannot point at another tenant's project")

await withUser(db, "user-a", async (tx) => {
  await tx.insert(project).values({
    id: "p-with-contact",
    userId: "user-a",
    contactId: "c-a",
    name: "With contact",
    status: "queued",
    position: 1,
    startedAt: "2026-01-01",
    dealKind: "upfront",
    dealAmountCents: 0n,
    dealCurrency: "BRL",
  })
})

let missingContactFailed = false
try {
  await withUser(db, "user-a", async (tx) => {
    await tx.insert(project).values({
      id: "p-bad-contact",
      userId: "user-a",
      contactId: "does-not-exist",
      name: "Bad contact",
      status: "queued",
      position: 2,
      startedAt: "2026-01-01",
      dealKind: "upfront",
      dealAmountCents: 0n,
      dealCurrency: "BRL",
    })
  })
} catch {
  missingContactFailed = true
}
assert.equal(missingContactFailed, true, "project cannot point at a contact that does not exist")

await withUser(db, "user-a", async (tx) => {
  await tx.update(contact).set({ name: "Alice Renamed" }).where(eq(contact.id, "c-a"))
  await tx.insert(customTool).values({
    id: "tool-a",
    userId: "user-a",
    name: "Acme Tool",
    category: "infra",
  })
})

const updatedAsB = await withUser(db, "user-b", async (tx) => {
  await tx.update(contact).set({ name: "Stolen" }).where(eq(contact.id, "c-a"))
  await tx.update(customTool).set({ name: "Stolen Tool" }).where(eq(customTool.id, "tool-a"))
  return {
    contacts: await tx.select().from(contact),
    tools: await tx.select().from(customTool),
  }
})
assert.equal(updatedAsB.contacts.length, 0, "update contact as B")
assert.equal(updatedAsB.tools.length, 0, "update custom tool as B")

const stillA = await withUser(db, "user-a", async (tx) => ({
  contact: (await tx.select().from(contact).where(eq(contact.id, "c-a")))[0],
  tool: (await tx.select().from(customTool).where(eq(customTool.id, "tool-a")))[0],
}))
assert.equal(stillA.contact?.name, "Alice Renamed", "A contact unchanged by B")
assert.equal(stillA.tool?.name, "Acme Tool", "A custom tool unchanged by B")

await client.close()
console.log("isolation.check.ts: ok")
