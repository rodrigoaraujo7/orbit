import { describe, expect, it } from "vitest"
import { EMAIL_KINDS, EMAIL_LOCALES } from "../config/index.ts"
import { emailSubject, unknownLabel } from "./index.ts"

describe("email messages", () => {
  it("has a distinct subject for every kind in both locales", () => {
    for (const locale of EMAIL_LOCALES) {
      const subjects = EMAIL_KINDS.map((kind) => emailSubject(kind, locale))
      expect(subjects.every((subject) => subject.length > 0)).toBe(true)
      expect(new Set(subjects).size).toBe(EMAIL_KINDS.length)
    }
    expect(emailSubject("login-otp", "en-US")).not.toBe(emailSubject("login-otp", "pt-BR"))
  })

  it("translates the unknown placeholder", () => {
    expect(unknownLabel("en-US")).toBe("Unknown")
    expect(unknownLabel("pt-BR")).toBe("Desconhecido")
  })
})
