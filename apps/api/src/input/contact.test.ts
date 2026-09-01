import { describe, expect, it } from "vitest"
import { contactIdInput, contactInput, contactUpdateInput } from "./contact.ts"
import { validation } from "./messages.ts"

function messages(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  if (result.success || !result.error) return []
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
}

const valid = {
  name: "Ada Lovelace",
  email: "ada@test.local",
  phone: "1199",
  company: "Acme",
}

describe("contactInput", () => {
  it("accepts a complete contact and optional empty email", () => {
    expect(contactInput.safeParse(valid).success).toBe(true)
    expect(contactInput.safeParse({ ...valid, email: "" }).success).toBe(true)
    expect(contactInput.safeParse({ name: "Ada Lovelace", phone: "1", company: "Co" }).success).toBe(true)
    expect(contactInput.parse({ ...valid, name: "  Ada  ", phone: "  1  ", company: "  Co  " })).toMatchObject({
      name: "Ada",
      phone: "1",
      company: "Co",
    })
  })

  it("rejects short name, missing phone/company and invalid email", () => {
    expect(messages(contactInput.safeParse({ ...valid, name: "A" }))).toContain(`name: ${validation.minChars}`)
    expect(messages(contactInput.safeParse({ ...valid, name: "  A  " }))).toContain(`name: ${validation.minChars}`)
    expect(messages(contactInput.safeParse({ ...valid, phone: "" }))).toContain(`phone: ${validation.enterPhone}`)
    expect(messages(contactInput.safeParse({ ...valid, phone: "   " }))).toContain(`phone: ${validation.enterPhone}`)
    expect(messages(contactInput.safeParse({ ...valid, company: "" }))).toContain(
      `company: ${validation.enterCompany}`,
    )
    expect(messages(contactInput.safeParse({ name: "Ada Lovelace" }))).toEqual(
      expect.arrayContaining([
        `phone: ${validation.enterPhone}`,
        `company: ${validation.enterCompany}`,
      ]),
    )
    expect(messages(contactInput.safeParse({ ...valid, email: "not-an-email" }))).toContain(
      `email: ${validation.emailInvalid}`,
    )
  })
})

describe("contact update and id", () => {
  it("requires a non-empty id", () => {
    expect(contactUpdateInput.safeParse({ ...valid, id: "c1" }).success).toBe(true)
    expect(contactUpdateInput.safeParse(valid).success).toBe(false)
    expect(contactIdInput.safeParse({ id: "c1" }).success).toBe(true)
    expect(contactIdInput.safeParse({ id: "" }).success).toBe(false)
    expect(contactIdInput.safeParse({ id: "  " }).success).toBe(false)
  })
})
