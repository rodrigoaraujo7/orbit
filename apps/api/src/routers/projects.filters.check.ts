/**
 * SQL list filters: search on client name, status, workflow, month bounds.
 * Run: node --experimental-strip-types src/routers/projects.filters.check.ts
 */
import { listProjects } from "./projects.ts"
import { contact, project } from "../db/schema.ts"
import { createTestDb, insertUser } from "../db/test-db.ts"
import { withUser } from "../db/with-user.ts"

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
  await tx.insert(contact).values([
    { id: "c1", userId: "user-a", name: "Acme Ltda" },
    { id: "c2", userId: "user-a", name: "Other Co" },
  ])
  await tx.insert(project).values([
    {
      id: "p1",
      userId: "user-a",
      name: "Landing",
      status: "in-development",
      position: 0,
      contactId: "c1",
      startedAt: "2026-03-10",
      dealKind: "upfront",
      dealAmountCents: 0n,
      dealCurrency: "BRL",
      repoFullName: "org/landing",
      repoUrl: "https://github.com/org/landing",
      repoWorkflow: "success",
    },
    {
      id: "p2",
      userId: "user-a",
      name: "Portal",
      status: "queued",
      position: 1,
      contactId: "c2",
      startedAt: "2026-01-15",
      dealKind: "upfront",
      dealAmountCents: 0n,
      dealCurrency: "BRL",
      repoFullName: "org/portal",
      repoUrl: "https://github.com/org/portal",
      repoWorkflow: "failure",
    },
  ])
})

await withUser(db, "user-b", async (tx) => {
  await tx.insert(contact).values({ id: "cb", userId: "user-b", name: "Acme Secret" })
  await tx.insert(project).values({
    id: "pb",
    userId: "user-b",
    name: "Secret",
    status: "in-development",
    position: 0,
    contactId: "cb",
    startedAt: "2026-03-10",
    dealKind: "upfront",
    dealAmountCents: 0n,
    dealCurrency: "BRL",
  })
})

const all = await withUser(db, "user-a", (tx) => listProjects(tx, "user-a"))
assert.equal(all.length, 2, "unfiltered list")

const byClientName = await withUser(db, "user-a", (tx) =>
  listProjects(tx, "user-a", { q: "acme" }),
)
assert.equal(byClientName.length, 1, "search on client name")
assert.equal(byClientName[0]?.name, "Landing")

const byProjectName = await withUser(db, "user-a", (tx) =>
  listProjects(tx, "user-a", { q: "portal" }),
)
assert.equal(byProjectName.length, 1, "search on project name")
assert.equal(byProjectName[0]?.name, "Portal")

const byStatus = await withUser(db, "user-a", (tx) =>
  listProjects(tx, "user-a", { status: "queued" }),
)
assert.equal(byStatus.length, 1, "status filter")
assert.equal(byStatus[0]?.id, "p2")

const byWorkflow = await withUser(db, "user-a", (tx) =>
  listProjects(tx, "user-a", { workflow: "success" }),
)
assert.equal(byWorkflow.length, 1, "workflow filter")
assert.equal(byWorkflow[0]?.id, "p1")

const byMonth = await withUser(db, "user-a", (tx) =>
  listProjects(tx, "user-a", { monthFrom: "2026-03", monthTo: "2026-03" }),
)
assert.equal(byMonth.length, 1, "month bounds")
assert.equal(byMonth[0]?.id, "p1")

const isolated = await withUser(db, "user-a", (tx) =>
  listProjects(tx, "user-a", { q: "secret" }),
)
assert.equal(isolated.length, 0, "does not leak the other tenant")

console.log("projects.filters.check.ts: ok")
