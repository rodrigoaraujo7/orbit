import { afterEach, describe, expect, it, vi } from "vitest"
import { periodBounds } from "./index"

afterEach(() => {
  vi.useRealTimers()
})

describe("periodBounds", () => {
  it("maps presets onto inclusive ISO dates", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    expect(periodBounds("all", "", "")).toEqual({})
    expect(periodBounds("today", "", "")).toEqual({ from: "2026-06-15", to: "2026-06-15" })
    expect(periodBounds("7d", "", "")).toEqual({ from: "2026-06-09", to: "2026-06-15" })
    expect(periodBounds("30d", "", "")).toEqual({ from: "2026-05-17", to: "2026-06-15" })
    expect(periodBounds("90d", "", "")).toEqual({ from: "2026-03-18", to: "2026-06-15" })
    expect(periodBounds("custom", "2026-01", "2026-02")).toEqual({ from: "2026-01", to: "2026-02" })
    expect(periodBounds("custom", "", "")).toEqual({ from: undefined, to: undefined })
  })
})
