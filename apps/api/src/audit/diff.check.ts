/**
 * Project diffs for the audit log: grouped by module, comments detected,
 * secret values never recorded.
 * Run: node --experimental-strip-types src/audit/diff.check.ts
 */
import { diffProject, type ProjectDiffInput } from "./diff.ts"

const SECRET = "super-secret-value-must-never-leak"

const assert = {
  equal(actual: unknown, expected: unknown, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  deepEqual(actual: unknown, expected: unknown, message = "") {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`)
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message)
  },
}

function project(overrides: Partial<ProjectDiffInput> = {}): ProjectDiffInput {
  return {
    name: "Projeto",
    clientId: "c1",
    status: "queued",
    startedAt: "2026-01-10",
    endedAt: null,
    deal: { kind: "upfront", amount: 0, currency: "BRL" },
    repo: null,
    description: "",
    comments: [],
    tools: [],
    ...overrides,
  }
}

const unchanged = diffProject(project(), project())
assert.deepEqual(unchanged, [], "no changes → no entries")

const byName = diffProject(project(), project({ name: "Novo" }))
assert.equal(byName.length, 1, "name is one module")
assert.equal(byName[0]?.module, "project")
assert.equal(byName[0]?.action, "project.update")
assert.deepEqual(byName[0]?.changes, [{ field: "name", from: "Projeto", to: "Novo" }])

const byStatus = diffProject(project(), project({ status: "in-development" }))
assert.equal(byStatus[0]?.module, "kanban")
assert.equal(byStatus[0]?.action, "kanban.move")
assert.deepEqual(byStatus[0]?.changes, [
  { field: "status", from: "queued", to: "in-development" },
])

const byDeal = diffProject(
  project(),
  project({ deal: { kind: "installment", amount: 18000, installments: 3, currency: "BRL" } }),
)
assert.equal(byDeal[0]?.module, "project")
assert.equal(byDeal[0]?.action, "project.update")
assert.ok(
  byDeal[0]?.changes.some((c) => c.field === "deal.amount" && c.to.includes("18000")),
  "deal amount is recorded",
)

const byRepo = diffProject(
  project(),
  project({ repo: { fullName: "a/b" } }),
)
assert.equal(byRepo[0]?.module, "project")
assert.deepEqual(byRepo[0]?.changes, [{ field: "repo", from: "", to: "a/b" }])

const workflowIgnored = diffProject(
  project({ repo: { fullName: "a/b" } }),
  project({ repo: { fullName: "a/b" } }),
)
assert.deepEqual(workflowIgnored, [], "repo fullName equal → no change")

const created = diffProject(
  project(),
  project({
    comments: [{ id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "oi" }],
  }),
)
assert.equal(created[0]?.module, "kanban")
assert.equal(created[0]?.action, "kanban.comment.create")
assert.deepEqual(created[0]?.changes, [{ field: "comment.created", from: "", to: "oi" }])

const edited = diffProject(
  project({
    comments: [{ id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "oi" }],
  }),
  project({
    comments: [{ id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "olá" }],
  }),
)
assert.equal(edited[0]?.action, "kanban.comment.edit")
assert.deepEqual(edited[0]?.changes, [{ field: "comment.edited", from: "oi", to: "olá" }])

const deleted = diffProject(
  project({
    comments: [{ id: "c1", author: "A", createdAt: "2026-08-20T10:00", body: "oi" }],
  }),
  project({ comments: [] }),
)
assert.equal(deleted[0]?.action, "kanban.comment.delete")
assert.deepEqual(deleted[0]?.changes, [{ field: "comment.deleted", from: "oi", to: "" }])

const mixed = diffProject(
  project(),
  project({
    name: "Novo",
    status: "paused",
    deal: { kind: "upfront", amount: 100, currency: "BRL" },
  }),
)
assert.deepEqual(
  mixed.map((e) => e.module).sort(),
  ["kanban", "project"],
  "project form vs kanban route",
)
assert.ok(
  mixed.find((e) => e.module === "project")?.changes.some((c) => c.field === "name"),
  "name stays on the project route",
)
assert.ok(
  mixed.find((e) => e.module === "project")?.changes.some((c) => c.field.startsWith("deal.")),
  "deal stays on the project route",
)

const secretPrev = project({
  tools: [{ id: "aws", name: "AWS", secrets: [{ key: "TOKEN" }] }],
})
const secretNext = project({
  tools: [{ id: "aws", name: "AWS", secrets: [{ key: "TOKEN", value: SECRET }] }],
})
const secretDiff = diffProject(secretPrev, secretNext)
assert.equal(secretDiff[0]?.module, "project")
assert.ok(
  secretDiff[0]?.changes.some((c) => c.field.includes("TOKEN")),
  "secret key is recorded",
)
assert.ok(
  !JSON.stringify(secretDiff).includes(SECRET),
  "secret values never reach the audit log",
)

const emptyValueKeeps = diffProject(
  secretPrev,
  project({
    tools: [{ id: "aws", name: "AWS", secrets: [{ key: "TOKEN", value: "" }] }],
  }),
)
assert.deepEqual(emptyValueKeeps, [], "empty secret value means keep previous, not a change")

console.log("audit/diff.check.ts: ok")
