import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PERSONA_INTERVAL_MS, PersonaRotator } from "./index"

const props = {
  prefix: "Built for",
  personas: ["developers", "vibecoders", "freelancers"],
  label: "Built for developers, vibecoders, and freelancers",
}

describe("PersonaRotator", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("cycles through every persona and wraps around", () => {
    const { unmount } = render(<PersonaRotator {...props} />)
    expect(screen.getByText(props.label)).toHaveClass("sr-only")
    expect(screen.getByTestId("persona")).toHaveTextContent("developers")

    act(() => vi.advanceTimersByTime(PERSONA_INTERVAL_MS))
    expect(screen.getByTestId("persona")).toHaveTextContent("vibecoders")

    act(() => vi.advanceTimersByTime(PERSONA_INTERVAL_MS * 2))
    expect(screen.getByTestId("persona")).toHaveTextContent("developers")

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("holds the first persona when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, media: query }))
    render(<PersonaRotator {...props} />)

    act(() => vi.advanceTimersByTime(PERSONA_INTERVAL_MS * 3))
    expect(screen.getByTestId("persona")).toHaveTextContent("developers")
  })

  it("keeps rotating when the media query does not match", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }))
    render(<PersonaRotator {...props} />)

    act(() => vi.advanceTimersByTime(PERSONA_INTERVAL_MS))
    expect(screen.getByTestId("persona")).toHaveTextContent("vibecoders")
  })
})
