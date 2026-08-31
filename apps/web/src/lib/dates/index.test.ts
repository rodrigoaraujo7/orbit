import { describe, expect, it } from "vitest"
import { monthOf, todayIso } from "./dates.ts"

describe("web date re-exports", () => {
  it("forwards shared date helpers", () => {
    expect(monthOf(todayIso())).toMatch(/^\d{4}-\d{2}$/)
  })
})
