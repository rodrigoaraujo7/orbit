import { describe, expect, it } from "vitest"
import {
  formatUsd,
  fill,
  intervalFromKey,
  PRO_MONTHLY_USD,
  PRO_YEARLY_USD,
  proMonthlyAmount,
  yearlyDiscountPercent,
  yearlyTotalUsd,
} from "./plans"

describe("pricing plans", () => {
  it("discounts the yearly Pro rate by 20 percent", () => {
    expect(PRO_MONTHLY_USD).toBe(20)
    expect(PRO_YEARLY_USD).toBe(16)
    expect(proMonthlyAmount("monthly")).toBe(20)
    expect(proMonthlyAmount("yearly")).toBe(16)
    expect(yearlyDiscountPercent()).toBe(20)
    expect(yearlyTotalUsd()).toBe(192)
  })

  it("formats whole US dollars and fills catalog placeholders", () => {
    expect(formatUsd(0)).toBe("$0")
    expect(formatUsd(16)).toBe("$16")
    expect(formatUsd(192)).toBe("$192")
    expect(fill("Save {percent}%", { percent: 20 })).toBe("Save 20%")
    expect(fill("{amount} billed yearly", { amount: formatUsd(192) })).toBe("$192 billed yearly")
  })

  it("maps arrow keys onto the billing interval", () => {
    expect(intervalFromKey("ArrowRight")).toBe("yearly")
    expect(intervalFromKey("ArrowDown")).toBe("yearly")
    expect(intervalFromKey("ArrowLeft")).toBe("monthly")
    expect(intervalFromKey("ArrowUp")).toBe("monthly")
    expect(intervalFromKey("Enter")).toBeNull()
    expect(intervalFromKey("")).toBeNull()
  })
})
