import { describe, expect, it } from "vitest"
import { TOOL_CATEGORIES, TOOL_CATEGORY_LABEL, toolCategorySchema } from "./tool-category.ts"

describe("tool categories", () => {
  it("labels every category slug", () => {
    expect(Object.keys(TOOL_CATEGORY_LABEL).sort()).toEqual(
      [
        "ai",
        "analytics",
        "communication",
        "database",
        "deploy",
        "observability",
        "other",
        "payments",
      ].sort(),
    )
    expect(TOOL_CATEGORY_LABEL.deploy).toBe("Deploy & Hosting")
    expect(TOOL_CATEGORY_LABEL.other).toBe("Outra")
  })

  it("accepts only known slugs", () => {
    expect([...toolCategorySchema.options].sort()).toEqual([...TOOL_CATEGORIES].sort())
    expect(toolCategorySchema.safeParse("deploy").success).toBe(true)
    expect(toolCategorySchema.safeParse("other").success).toBe(true)
    expect(toolCategorySchema.safeParse("infra").success).toBe(false)
    expect(toolCategorySchema.safeParse("").success).toBe(false)
    expect(toolCategorySchema.safeParse("Deploy").success).toBe(false)
  })
})
