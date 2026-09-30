import { describe, expect, it } from "vitest"
import { applyPointerVars, clearPointerVars, pointerVars, POINTER_PROPERTIES } from "./pointer"

const box = { left: 100, top: 50, width: 400, height: 200 }

describe("pointerVars", () => {
  it("maps the pointer to card coordinates and a centered -1…1 range", () => {
    expect(pointerVars(box, 300, 150)).toEqual({ x: 200, y: 100, px: 0 })
    expect(pointerVars(box, 100, 50)).toEqual({ x: 0, y: 0, px: -1 })
    expect(pointerVars(box, 500, 250)).toEqual({ x: 400, y: 200, px: 1 })
    expect(pointerVars(box, 200, 100)).toEqual({ x: 100, y: 50, px: -0.5 })
  })

  it("clamps a pointer that is outside the card", () => {
    expect(pointerVars(box, 0, 900)).toEqual({ x: 0, y: 200, px: -1 })
  })

  it("stays centered when the card has no size yet", () => {
    expect(pointerVars({ left: 0, top: 0, width: 0, height: 0 }, 40, 40)).toEqual({
      x: 0,
      y: 0,
      px: 0,
    })
  })
})

describe("applyPointerVars / clearPointerVars", () => {
  it("writes the custom properties and removes them again", () => {
    const { style } = document.createElement("div")
    applyPointerVars(style, { x: 12, y: 34, px: 0.25 })
    expect(style.getPropertyValue("--mx")).toBe("12px")
    expect(style.getPropertyValue("--my")).toBe("34px")
    expect(style.getPropertyValue("--px")).toBe("0.25")

    clearPointerVars(style)
    for (const property of POINTER_PROPERTIES) expect(style.getPropertyValue(property)).toBe("")
  })
})
