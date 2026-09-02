import { describe, expect, it } from "vitest"
import * as shared from "./index.ts"

describe("shared barrel", () => {
  it("re-exports domain, money, dates and dashboard helpers", () => {
    expect(shared.DEFAULT_CURRENCY).toBe("BRL")
    expect(shared.parseAmount("10")).toBe(10)
    expect(shared.projectStatusSchema.options).toContain("queued")
    expect(typeof shared.buildDashboardMetrics).toBe("function")
    expect(typeof shared.generateInvoices).toBe("function")
    expect(typeof shared.compactSearch).toBe("function")
    expect(shared.AUDIT_ACTIONS.length).toBeGreaterThan(0)
    expect(shared.TOOL_CATEGORY_LABEL.deploy).toBeTruthy()
    expect(shared.toolCategorySchema.safeParse("deploy").success).toBe(true)
    expect(shared.TOOL_CATEGORIES).toContain("other")
    expect(shared.isDealFree({ kind: "upfront", amount: 0 })).toBe(true)
    expect(shared.runWorkflowStatus("completed", "success")).toBe("success")
    expect(typeof shared.mergeRun).toBe("function")
    expect(typeof shared.isRunActive).toBe("function")
    expect(typeof shared.branchWorkflowStatus).toBe("function")
    expect(shared.projectDetailSearchSchema.safeParse({ branch: "main" }).success).toBe(true)
  })
})
