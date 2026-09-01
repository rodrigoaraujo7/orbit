import { describe, expect, it } from "vitest"
import { nextSort, sortRows } from "./index"

describe("table-sort", () => {
  it("cycles sort state", () => {
    expect(nextSort(null, "name")).toEqual({ key: "name", direction: "asc" })
    expect(nextSort({ key: "name", direction: "asc" }, "name")).toEqual({
      key: "name",
      direction: "desc",
    })
    expect(nextSort({ key: "name", direction: "desc" }, "name")).toBeNull()
    expect(nextSort({ key: "name", direction: "desc" }, "amount")).toEqual({
      key: "amount",
      direction: "asc",
    })
  })

  it("sorts numbers and locale text without mutating", () => {
    const rows = [
      { id: "a", name: "Zeta", amount: 30 },
      { id: "b", name: "Álvaro", amount: 10 },
      { id: "c", name: "beta", amount: 20 },
    ]
    expect(sortRows(rows, { key: "amount", direction: "asc" }, (r) => r.amount).map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ])
    expect(sortRows(rows, { key: "amount", direction: "desc" }, (r) => r.amount).map((r) => r.id)).toEqual([
      "a",
      "c",
      "b",
    ])
    expect(sortRows(rows, { key: "name", direction: "asc" }, (r) => r.name, "pt-BR").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ])
    expect(sortRows(rows, null, (r) => r.amount).map((r) => r.id)).toEqual(["a", "b", "c"])
    expect(sortRows(rows, { key: "amount", direction: "asc" }, undefined).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ])
    expect(
      sortRows(
        [
          { id: "a", n: 1 },
          { id: "b", n: 1 },
        ],
        { key: "n", direction: "asc" },
        (row) => row.n,
      ).map((row) => row.id),
    ).toEqual(["a", "b"])
    sortRows(rows, { key: "amount", direction: "desc" }, (r) => r.amount)
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"])
  })
})
