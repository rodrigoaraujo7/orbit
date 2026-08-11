/**
 * Self-check of the table sorting (see table-sort.ts).
 * Run with: pnpm check:table-sort
 */
import { nextSort, sortRows } from "./table-sort.ts"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`expected ${e}, got ${a}`)
  },
}

// 3-state cycle on the same column
assert.deepEqual(nextSort(null, "name"), { key: "name", direction: "asc" })
assert.deepEqual(nextSort({ key: "name", direction: "asc" }, "name"), {
  key: "name",
  direction: "desc",
})
assert.deepEqual(nextSort({ key: "name", direction: "desc" }, "name"), null)

// switching column restarts at asc
assert.deepEqual(nextSort({ key: "name", direction: "desc" }, "amount"), {
  key: "amount",
  direction: "asc",
})

const rows = [
  { id: "a", name: "Zeta", amount: 30 },
  { id: "b", name: "Álvaro", amount: 10 },
  { id: "c", name: "beta", amount: 20 },
]

// number: asc/desc
assert.deepEqual(
  sortRows(rows, { key: "amount", direction: "asc" }, (r) => r.amount).map((r) => r.id),
  ["b", "c", "a"]
)
assert.deepEqual(
  sortRows(rows, { key: "amount", direction: "desc" }, (r) => r.amount).map((r) => r.id),
  ["a", "c", "b"]
)

// text: accents follow pt-BR order and case does not split the groups
assert.deepEqual(
  sortRows(rows, { key: "name", direction: "asc" }, (r) => r.name).map((r) => r.id),
  ["b", "c", "a"]
)

// unsorted (or a column with no sortValue) returns the original order
assert.deepEqual(sortRows(rows, null, (r) => r.amount).map((r) => r.id), ["a", "b", "c"])
assert.deepEqual(
  sortRows(rows, { key: "amount", direction: "asc" }, undefined).map((r) => r.id),
  ["a", "b", "c"]
)

// does not mutate the input array
sortRows(rows, { key: "amount", direction: "desc" }, (r) => r.amount)
assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"])

console.log("table-sort: all checks passed")
