import { describe, expect, it } from "vitest"
import { fromCents, hasPositiveAmount, parseAmount, toCents } from "./money.ts"

describe("parseAmount", () => {
  it("returns null for empty or non-numeric input", () => {
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("abc")).toBeNull()
  })

  it("parses pt-BR grouped and decimal amounts", () => {
    expect(parseAmount("18000")).toBe(18000)
    expect(parseAmount("18.000,50")).toBe(18000.5)
    expect(parseAmount("0")).toBe(0)
    expect(parseAmount("0,00")).toBe(0)
  })

  it("parses en-US grouped and decimal amounts", () => {
    expect(parseAmount("18,000.50", "en-US")).toBe(18000.5)
    expect(parseAmount("18000.50", "en-US")).toBe(18000.5)
    expect(parseAmount("0.00", "en-US")).toBe(0)
    expect(parseAmount("18.000,50", "en-US") === 18000.5).toBe(false)
  })
})

describe("hasPositiveAmount", () => {
  it("treats empty and zero as free", () => {
    expect(hasPositiveAmount("")).toBe(false)
    expect(hasPositiveAmount("0")).toBe(false)
    expect(hasPositiveAmount("0,00")).toBe(false)
    expect(hasPositiveAmount("0.00", "en-US")).toBe(false)
  })

  it("accepts amounts greater than zero", () => {
    expect(hasPositiveAmount("1")).toBe(true)
    expect(hasPositiveAmount("0,01")).toBe(true)
    expect(hasPositiveAmount("0.01", "en-US")).toBe(true)
  })
})

describe("cents conversion", () => {
  it("rounds to integer cents and back", () => {
    expect(toCents(18.5)).toBe(1850n)
    expect(toCents(0)).toBe(0n)
    expect(toCents(18.005)).toBe(1801n)
    expect(fromCents(1850n)).toBe(18.5)
    expect(fromCents(toCents(99.99))).toBe(99.99)
  })
})
