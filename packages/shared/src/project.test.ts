import { describe, expect, it } from "vitest"
import { isDealFree } from "./project.ts"

describe("isDealFree", () => {
  it("treats zero and negative amounts as free", () => {
    expect(isDealFree({ kind: "upfront", amount: 0 })).toBe(true)
    expect(isDealFree({ kind: "upfront", amount: -1 })).toBe(true)
    expect(isDealFree({ kind: "installment", amount: 100, installments: 2 })).toBe(false)
  })
})
