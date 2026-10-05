import { describe, expect, it } from "vitest"
import { LIGHTS_ON_MS, applyLightsOn, lightsOnPower } from "./lights-on"

describe("lightsOnPower", () => {
  it("starts dark and reaches full brightness on an ease-out", () => {
    expect(lightsOnPower(0)).toBe(0)
    expect(lightsOnPower(-20)).toBe(0)
    expect(lightsOnPower(LIGHTS_ON_MS / 2)).toBeGreaterThan(0.8)
    expect(lightsOnPower(LIGHTS_ON_MS)).toBe(1)
    expect(lightsOnPower(LIGHTS_ON_MS + 400)).toBe(1)
  })

  it("rises once, without a second brightness dip", () => {
    const early = lightsOnPower(LIGHTS_ON_MS * 0.2)
    const mid = lightsOnPower(LIGHTS_ON_MS * 0.35)
    const later = lightsOnPower(LIGHTS_ON_MS * 0.55)
    expect(mid).toBeGreaterThan(early)
    expect(later).toBeGreaterThan(mid)
    expect(later).toBeGreaterThan(0.85)
  })

  it("skips the warm-up when motion is reduced", () => {
    expect(lightsOnPower(0, true)).toBe(1)
    expect(lightsOnPower(120, true)).toBe(1)
  })
})

describe("applyLightsOn", () => {
  it("keeps the rays short until they are bright", () => {
    const uniforms = { power: { value: 1 }, rayLength: { value: 9 } }
    applyLightsOn(uniforms, 0, 4)
    expect(uniforms.power.value).toBe(0)
    expect(uniforms.rayLength.value).toBe(1)

    applyLightsOn(uniforms, LIGHTS_ON_MS, 4)
    expect(uniforms.power.value).toBe(1)
    expect(uniforms.rayLength.value).toBe(4)
  })
})
