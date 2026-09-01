import { describe, expect, it } from "vitest"
import { customToolIdInput, customToolInput, customToolUpdateInput } from "./custom-tool.ts"
import { validation } from "./messages.ts"

function messages(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  if (result.success || !result.error) return []
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
}

describe("customToolInput", () => {
  it("accepts a named tool in a known category", () => {
    expect(customToolInput.safeParse({ name: "Acme CI", category: "deploy" }).success).toBe(true)
    expect(customToolInput.parse({ name: "  CI  ", category: "other" })).toMatchObject({
      name: "CI",
    })
  })

  it("rejects short names and unknown categories", () => {
    expect(messages(customToolInput.safeParse({ name: "A", category: "deploy" }))).toContain(
      `name: ${validation.minChars}`,
    )
    expect(messages(customToolInput.safeParse({ name: "Acme CI", category: "infra" }))).toContain(
      `category: ${validation.selectCategory}`,
    )
    expect(messages(customToolInput.safeParse({ name: "Acme CI", category: "" }))).toContain(
      `category: ${validation.selectCategory}`,
    )
  })

  it("requires a non-empty id on update and delete", () => {
    expect(
      customToolUpdateInput.safeParse({ id: "t1", name: "Acme CI", category: "deploy" }).success,
    ).toBe(true)
    expect(customToolIdInput.safeParse({ id: "" }).success).toBe(false)
    expect(
      customToolUpdateInput.safeParse({ id: "  ", name: "Acme CI", category: "deploy" }).success,
    ).toBe(false)
  })
})
