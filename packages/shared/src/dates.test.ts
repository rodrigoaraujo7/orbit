import { afterEach, describe, expect, it, vi } from "vitest"
import {
  addMonths,
  dayOfMonth,
  lastDayOfMonth,
  monthOf,
  monthRange,
  monthsBetween,
  nowDateTimeIso,
  todayIso,
} from "./dates.ts"

afterEach(() => {
  vi.useRealTimers()
})

describe("todayIso / nowDateTimeIso", () => {
  it("formats local calendar date and time", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 13, 4, 7))
    expect(todayIso()).toBe("2026-06-15")
    expect(nowDateTimeIso()).toBe("2026-06-15T13:04")
  })

  it("pads single-digit months, days, hours and minutes", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 9, 8))
    expect(todayIso()).toBe("2026-01-05")
    expect(nowDateTimeIso()).toBe("2026-01-05T09:08")
  })
})

describe("month helpers", () => {
  it("truncates a day to a month and is a no-op on months", () => {
    expect(monthOf("2026-09-05")).toBe("2026-09")
    expect(monthOf("2026-09")).toBe("2026-09")
  })

  it("adds and subtracts whole months across years", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02")
    expect(addMonths("2026-01", -1)).toBe("2025-12")
    expect(addMonths("2026-07", 0)).toBe("2026-07")
  })

  it("clamps the day to the month length", () => {
    expect(dayOfMonth("2026-04", 31)).toBe("2026-04-30")
    expect(dayOfMonth("2026-02", 31)).toBe("2026-02-28")
    expect(dayOfMonth("2026-01", 9)).toBe("2026-01-09")
  })

  it("returns the last calendar day of a month", () => {
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28")
    expect(lastDayOfMonth("2026-01")).toBe("2026-01-31")
  })

  it("builds an inclusive month range and an empty one when inverted", () => {
    expect(monthRange("2026-07", "2026-09")).toEqual(["2026-07", "2026-08", "2026-09"])
    expect(monthRange("2026-07", "2026-07")).toEqual(["2026-07"])
    expect(monthRange("2026-09", "2026-07")).toEqual([])
  })

  it("counts whole months between two values", () => {
    expect(monthsBetween("2026-07", "2026-09")).toBe(2)
    expect(monthsBetween("2026-09", "2026-07")).toBe(-2)
    expect(monthsBetween("2025-12", "2026-01")).toBe(1)
  })
})
