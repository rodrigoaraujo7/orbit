import { describe, expect, it } from "vitest"
import {
  compactSearch,
  parseSearch,
  auditSearchSchema,
  dashboardFiltersSchema,
  invoiceListFiltersSchema,
  kanbanSearchSchema,
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
    expect(parseSearch(projectsSearchSchema, { q: "  acme  ", status: "queued", noise: 1 })).toEqual({
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
    expect(invoiceListFiltersSchema.parse({ projectId: "p1", status: "all" })).toMatchObject({
      projectId: "p1",
      status: "all",
    })
    expect(auditSearchSchema.parse({ period: "7d", module: "kanban" })).toMatchObject({
      period: "7d",
      module: "kanban",
    })
  })
})
