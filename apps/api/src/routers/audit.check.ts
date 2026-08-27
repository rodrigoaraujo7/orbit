/**
 * Audit list: keyset pagination, filters, tenant isolation, append-only.
 * Run: node --experimental-strip-types src/routers/audit.check.ts
 */
import { eq, sql } from "drizzle-orm"
import { auditLog } from "../db/schema.ts"
import { createTestDb, insertUser } from "../db/test-db.ts"
import { withUser } from "../db/with-user.ts"
import { listAuditLogs } from "./audit.ts"

const assert = {
  equal(actual: unknown, expected: unknown, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message)
  },
}

const { db, client } = await createTestDb()
await insertUser(client, "user-a")
await insertUser(client, "user-b")

async function seed(userId: string, rows: Array<{
  id: string
  module: string
  action: string
  createdAt: string
  subjectLabel?: string
  projectId?: string
}>) {
  await withUser(db, userId, async (tx) => {
    for (const row of rows) {
      await tx.insert(auditLog).values({
        id: row.id,
        userId,
        module: row.module,
        action: row.action,
        subjectLabel: row.subjectLabel ?? null,
        projectId: row.projectId ?? null,
        changes: [],
        createdAt: new Date(row.createdAt),
      })
    }
  })
}

await seed("user-a", [
  { id: "a1", module: "project", action: "project.create", createdAt: "2026-08-01T10:00:00.000Z", subjectLabel: "Portal" },
  { id: "a2", module: "kanban", action: "kanban.move", createdAt: "2026-08-02T10:00:00.000Z", subjectLabel: "Portal", projectId: "p1" },
  { id: "a3", module: "settings", action: "contact.create", createdAt: "2026-08-03T10:00:00.000Z", subjectLabel: "Ada" },
  { id: "a4", module: "project", action: "project.update", createdAt: "2026-08-04T10:00:00.000Z", subjectLabel: "Portal", projectId: "p1" },
  { id: "a5", module: "security", action: "security.login", createdAt: "2026-08-05T10:00:00.000Z" },
])
await seed("user-b", [
  { id: "b1", module: "project", action: "project.create", createdAt: "2026-08-06T10:00:00.000Z", subjectLabel: "Secret" },
])

const page1 = await withUser(db, "user-a", (tx) => listAuditLogs(tx, { limit: 2 }))
assert.equal(page1.items.length, 2, "page size")
assert.equal(page1.items[0]?.id, "a5", "newest first")
assert.equal(page1.items[1]?.id, "a4")
assert.ok(page1.nextCursor, "has next cursor")

const page2 = await withUser(db, "user-a", (tx) =>
  listAuditLogs(tx, { limit: 2, cursor: page1.nextCursor }),
)
assert.equal(page2.items.map((r) => r.id).join(","), "a3,a2", "page 2 continues without gaps")

const page3 = await withUser(db, "user-a", (tx) =>
  listAuditLogs(tx, { limit: 2, cursor: page2.nextCursor }),
)
assert.equal(page3.items.map((r) => r.id).join(","), "a1", "last page")
assert.equal(page3.nextCursor, null, "no extra page")

const allIds = [...page1.items, ...page2.items, ...page3.items].map((r) => r.id)
assert.equal(new Set(allIds).size, allIds.length, "no repeats across pages")

const kanban = await withUser(db, "user-a", (tx) =>
  listAuditLogs(tx, { modules: ["kanban"] }),
)
assert.equal(kanban.items.length, 1, "module filter")
assert.equal(kanban.items[0]?.id, "a2")

const search = await withUser(db, "user-a", (tx) => listAuditLogs(tx, { search: "Ada" }))
assert.equal(search.items.length, 1, "search subject_label")
assert.equal(search.items[0]?.id, "a3")

const ranged = await withUser(db, "user-a", (tx) =>
  listAuditLogs(tx, { from: "2026-08-02", to: "2026-08-04" }),
)
assert.equal(ranged.items.map((r) => r.id).join(","), "a4,a3,a2", "inclusive date range")

const byProject = await withUser(db, "user-a", (tx) =>
  listAuditLogs(tx, { projectId: "p1" }),
)
assert.equal(byProject.items.length, 2, "project filter")

const asB = await withUser(db, "user-b", (tx) => listAuditLogs(tx, {}))
assert.equal(asB.items.length, 1, "B only sees own rows")
assert.equal(asB.items[0]?.id, "b1")
assert.ok(
  asB.items.every((row) => row.id !== "a1"),
  "B cannot read A's entries",
)

let updateDenied = false
try {
  await withUser(db, "user-a", async (tx) => {
    await tx.update(auditLog).set({ action: "tampered" }).where(eq(auditLog.id, "a1"))
  })
} catch {
  updateDenied = true
}
assert.equal(updateDenied, true, "app_runtime cannot update audit_log")

let deleteDenied = false
try {
  await withUser(db, "user-a", async (tx) => {
    await tx.delete(auditLog).where(eq(auditLog.id, "a1"))
  })
} catch {
  deleteDenied = true
}
assert.equal(deleteDenied, true, "app_runtime cannot delete audit_log")

const stillThere = await withUser(db, "user-a", (tx) =>
  tx.execute(sql`select id from audit_log where id = 'a1'`),
)
const remaining = (stillThere as { rows?: unknown[] }).rows ?? (stillThere as unknown[])
assert.ok(Array.isArray(remaining) && remaining.length === 1, "a1 survived tamper attempts")

await client.close()
console.log("routers/audit.check.ts: ok")
