import { describe, expect, it } from "vitest"
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencyOptions } from "./index"
import * as dates from "../dates/index.ts"

describe("currency", () => {
  it("lists locale-aware options", () => {
    expect(DEFAULT_CURRENCY).toBe("BRL")
    expect(getCurrencyOptions().map((row) => row.value)).toEqual([...CURRENCIES])
    expect(getCurrencyOptions()[0]?.label).toContain("BRL")
  })
})

describe("dates re-export", () => {
  it("exposes shared helpers", () => {
    expect(dates.monthOf("2026-01-15")).toBe("2026-01")
    expect(dates.addMonths("2026-01", 1)).toBe("2026-02")
    expect(dates.dayOfMonth("2026-01", 9)).toBe("2026-01-09")
    expect(dates.lastDayOfMonth("2026-01")).toBe("2026-01-31")
    expect(dates.monthRange("2026-01", "2026-02")).toEqual(["2026-01", "2026-02"])
    expect(dates.monthsBetween("2026-01", "2026-02")).toBe(1)
    expect(dates.todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dates.nowDateTimeIso()).toMatch(/T/)
  })
})
