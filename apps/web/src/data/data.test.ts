import { describe, expect, it } from "vitest"
import { contacts } from "./contacts.ts"
import { findCatalogTool, OTHER_TOOL_ID, toolCatalog, toolsByCategory } from "./tool-catalog.ts"
import { isDealFree, PROJECT_STATUS_ORDER, projects } from "./projects.ts"

describe("data modules", () => {
  it("exposes catalogs and mock collections", () => {
    expect(contacts.length).toBeGreaterThan(0)
    expect(findCatalogTool("aws")?.name).toBe("AWS")
    expect(findCatalogTool("missing")).toBeUndefined()
    expect(toolsByCategory("deploy").length).toBeGreaterThan(0)
    expect(toolCatalog.some((tool) => tool.id === OTHER_TOOL_ID)).toBe(true)
    expect(PROJECT_STATUS_ORDER).toContain("queued")
    expect(projects.length).toBeGreaterThan(0)
    expect(isDealFree({ kind: "upfront", amount: 0 })).toBe(true)
    expect(isDealFree({ kind: "upfront", amount: 10 })).toBe(false)
  })
})
