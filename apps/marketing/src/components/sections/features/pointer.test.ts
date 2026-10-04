import { describe, expect, it } from "vitest"
import {
  applyPointerVars,
  applySpotlight,
  clearPointerVars,
  fadeSpotlight,
  hoveredCard,
  pointerVars,
  POINTER_PROPERTIES,
  spotlightPoint,
} from "./pointer"

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

describe("spotlightPoint", () => {
  it("keeps a pointer that sits outside the card so the glow can spill onto its neighbors", () => {
    expect(spotlightPoint(box, 40, 40)).toEqual({ x: -60, y: -10 })
    expect(spotlightPoint(box, 600, 300)).toEqual({ x: 500, y: 250 })
    expect(spotlightPoint(box, 300, 150)).toEqual({ x: 200, y: 100 })
  })
})

describe("hoveredCard", () => {
  it("finds the card under the pointer and ignores anything else", () => {
    const card = document.createElement("article")
    card.className = "bento-card"
    const child = document.createElement("span")
    card.append(child)

    expect(hoveredCard(child)).toBe(card)
    expect(hoveredCard(card)).toBe(card)
    expect(hoveredCard(document.createElement("div"))).toBeNull()
    expect(hoveredCard(document.createTextNode("gap"))).toBeNull()
    expect(hoveredCard(null)).toBeNull()
  })
})

describe("applySpotlight / fadeSpotlight", () => {
  it("pins the glow to the pointer and fades it without moving that point", () => {
    const { style } = document.createElement("div")
    applySpotlight(style, { x: -20, y: 80 })
    expect(style.getPropertyValue("--mx")).toBe("-20px")
    expect(style.getPropertyValue("--my")).toBe("80px")
    expect(style.getPropertyValue("--glow")).toBe("1")

    fadeSpotlight(style)
    expect(style.getPropertyValue("--glow")).toBe("0")
    expect(style.getPropertyValue("--mx")).toBe("-20px")
    expect(style.getPropertyValue("--my")).toBe("80px")
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
