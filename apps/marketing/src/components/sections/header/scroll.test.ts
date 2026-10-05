import { afterEach, describe, expect, it, vi } from "vitest"
import { followInPageNav } from "./scroll"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function click(
  href: string | null,
  overrides: Partial<{
    defaultPrevented: boolean
    button: number
    metaKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
  }> = {},
) {
  const preventDefault = vi.fn()
  followInPageNav({
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentTarget: { getAttribute: () => href },
    preventDefault,
    ...overrides,
  })
  return preventDefault
}

function mountSection(id: string) {
  const section = document.createElement("section")
  section.id = id
  section.scrollIntoView = vi.fn()
  document.body.append(section)
  return section
}

afterEach(() => {
  document.getElementById("pricing")?.remove()
  window.history.replaceState(null, "", "/")
  Reflect.deleteProperty(window, "matchMedia")
})

describe("followInPageNav", () => {
  it("smoothly scrolls to the section and records the hash", () => {
    const pricing = mountSection("pricing")

    const preventDefault = click("#pricing")

    expect(pricing.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
    expect(window.location.hash).toBe("#pricing")
    expect(preventDefault).toHaveBeenCalledOnce()
  })

  it("scrolls instantly when the user prefers reduced motion", () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === REDUCED_MOTION,
      media: query,
    })) as unknown as typeof window.matchMedia
    const pricing = mountSection("pricing")

    click("#pricing")

    expect(window.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION)
    expect(pricing.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" })
  })

  it("still scrolls smoothly when reduced motion is off", () => {
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: REDUCED_MOTION,
    })) as unknown as typeof window.matchMedia
    const pricing = mountSection("pricing")

    click("#pricing")

    expect(pricing.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
  })

  it("leaves the click alone when matchMedia is unavailable", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    const pricing = mountSection("pricing")

    click("#pricing")

    expect(pricing.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
  })

  it.each([
    { defaultPrevented: true },
    { button: 1 },
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
  ])("does not scroll for a browser-owned click %j", (overrides) => {
    const pricing = mountSection("pricing")

    const preventDefault = click("#pricing", overrides)

    expect(pricing.scrollIntoView).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.hash).toBe("")
  })

  it("ignores links that leave the page", () => {
    const preventDefault = click("https://app.example/sign-in")

    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.hash).toBe("")
  })

  it("ignores a link with no href", () => {
    const preventDefault = click(null)

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it("leaves the click alone when the section is missing", () => {
    const preventDefault = click("#pricing")

    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.hash).toBe("")
  })
})
