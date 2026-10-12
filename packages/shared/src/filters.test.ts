import { describe, expect, it } from "vitest"
import {
  compactSearch,
  parseSearch,
  auditSearchSchema,
  dashboardFiltersSchema,
  dashboardSearchSchema,
  invoiceListFiltersSchema,
  kanbanSearchSchema,
  monthInputMessage,
  projectDetailSearchSchema,
  projectListFiltersSchema,
  projectsSearchSchema,
} from "./filters.ts"

describe("compactSearch", () => {
  it("drops blank values and keeps the rest", () => {
    expect(compactSearch({ q: "", status: "queued", client: undefined, extra: null })).toEqual({
      status: "queued",
    })
    expect(compactSearch({ q: "acme" })).toEqual({ q: "acme" })
  })
})

describe("parseSearch", () => {
  it("strips blanks and keeps known keys", () => {
    expect(
      parseSearch(projectsSearchSchema, { q: "  acme  ", status: "queued", noise: 1 }),
    ).toEqual({
      q: "acme",
      status: "queued",
    })
    expect(parseSearch(projectsSearchSchema, { q: "" })).toEqual({})
  })

  it("treats a non-object search as empty", () => {
    expect(parseSearch(kanbanSearchSchema, "nope")).toEqual({})
    expect(parseSearch(kanbanSearchSchema, null)).toEqual({})
  })

  it("falls back to schema defaults when the URL is garbage", () => {
    expect(parseSearch(projectsSearchSchema, { status: "not-a-status" })).toEqual({})
  })

  it("parses list and dashboard filter shapes", () => {
    expect(projectListFiltersSchema.parse({ q: " a ", workflow: "success" })).toMatchObject({
      q: "a",
      workflow: "success",
    })
    expect(dashboardFiltersSchema.parse({ currency: "USD" })).toMatchObject({ currency: "USD" })
    expect(dashboardFiltersSchema.parse({ monthFrom: " 2026-01 ", monthTo: "" })).toMatchObject({
      monthFrom: "2026-01",
      monthTo: "",
    })
    const rejected = dashboardFiltersSchema.safeParse({ monthFrom: "0", monthTo: "2026-13" })
    expect(rejected.success).toBe(false)
    if (!rejected.success) {
      expect(rejected.error.issues.map((issue) => issue.message)).toEqual([
        monthInputMessage,
        monthInputMessage,
      ])
    }
    expect(
      parseSearch(dashboardSearchSchema, { from: "0", to: "zzz", currency: "USD", client: "c1" }),
    ).toEqual({ currency: "USD", client: "c1" })
    expect(parseSearch(dashboardSearchSchema, { from: " 2026-01 ", to: "2026-06" })).toEqual({
      from: "2026-01",
      to: "2026-06",
    })
    expect(parseSearch(dashboardSearchSchema, { from: "   ", to: 1 })).toEqual({})
    expect("from" in parseSearch(dashboardSearchSchema, { from: "0", currency: "USD" })).toBe(false)
    expect(invoiceListFiltersSchema.parse({ projectId: "p1", status: "all" })).toMatchObject({
      projectId: "p1",
      status: "all",
    })
    expect(auditSearchSchema.parse({ period: "7d", module: "kanban" })).toMatchObject({
      period: "7d",
      module: "kanban",
    })
  })

  it("keeps the branch alongside the invoice filters on project detail", () => {
    expect(parseSearch(projectDetailSearchSchema, { status: "paid", branch: " main " })).toEqual({
      status: "paid",
      branch: "main",
    })
    expect(parseSearch(projectDetailSearchSchema, { branch: "" })).toEqual({})
  })
})
