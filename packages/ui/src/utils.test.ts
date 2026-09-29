import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges tailwind classes and drops falsy values", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
    expect(cn("text-red-500", false && "hidden", "font-bold")).toBe("text-red-500 font-bold")
  })
})
