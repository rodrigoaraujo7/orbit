import { readFileSync } from "node:fs"
import path from "node:path"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BentoCard } from "./card"
import { BentoGrid } from "./grid"
import {
  SCROLL_ACTIVATION_QUERY,
  SCROLL_ACTIVATION_THRESHOLD,
  applyScrollActivation,
  bindScrollActivation,
  usesScrollActivation,
} from "./scroll"

class IntersectionStub {
  static instances: IntersectionStub[] = []
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit | undefined
  observed: Element | undefined
  disconnect = vi.fn()

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    IntersectionStub.instances.push(this)
  }

  observe(element: Element) {
    this.observed = element
  }

  unobserve() {}
  takeRecords() {
    return []
  }
}

type Query = MediaQueryList & { setMatches: (matches: boolean) => void }

function installMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const query = {
    matches,
    media: SCROLL_ACTIVATION_QUERY,
    addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
      listeners.add(listener)
    },
    removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
      listeners.delete(listener)
    },
    setMatches(next: boolean) {
      query.matches = next
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
    },
  }
  window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia
  return query as Query
}

function intersect(
  entry: Pick<IntersectionObserverEntry, "intersectionRatio" | "isIntersecting"> | null,
) {
  const observer = IntersectionStub.instances.at(-1)
  if (!observer) throw new Error("missing observer")
  act(() => {
    observer.callback(
      entry === null ? [] : [entry as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    )
  })
}

afterEach(() => {
  IntersectionStub.instances = []
  Reflect.deleteProperty(window, "matchMedia")
  Reflect.deleteProperty(window, "IntersectionObserver")
})

describe("scroll activation", () => {
  it("keeps the pointer glow off below the lg breakpoint", () => {
    const css = readFileSync(path.join(import.meta.dirname, "../../../app/globals.css"), "utf8")
    expect(css).toContain("@media (max-width: 1023px)")
    expect(css).toMatch(/\.bento-spotlight,\s*\.bento-card::after \{\s*display: none;/)
    expect(css).toContain("opacity: var(--glow, 0)")
    expect(css).toContain(".security-stage[data-active] .bento-spotlight")
    expect(css).not.toContain(".bento-card[data-active] .bento-spotlight")
  })

  it("turns the attribute on and off", () => {
    const node = document.createElement("article")
    applyScrollActivation(node, true)
    expect(node).toHaveAttribute("data-active")
    applyScrollActivation(node, false)
    expect(node).not.toHaveAttribute("data-active")
  })

  it("reports scroll mode only when the small-screen query matches", () => {
    expect(usesScrollActivation()).toBe(false)
    installMedia(false)
    expect(usesScrollActivation()).toBe(false)
    expect(window.matchMedia).toHaveBeenCalledWith(SCROLL_ACTIVATION_QUERY)
    installMedia(true)
    expect(usesScrollActivation()).toBe(true)
  })

  it("does nothing without a card or a media query", () => {
    expect(bindScrollActivation(null)()).toBeUndefined()
    const node = document.createElement("article")
    node.dataset.active = ""
    expect(bindScrollActivation(node)()).toBeUndefined()
    expect(node).toHaveAttribute("data-active")
  })

  it("plays the illustration only while at least 35% of the card is visible", () => {
    window.IntersectionObserver = IntersectionStub as unknown as typeof IntersectionObserver
    installMedia(true)
    const node = document.createElement("article")

    const stop = bindScrollActivation(node)
    const observer = IntersectionStub.instances[0]
    expect(observer.options).toEqual({ threshold: SCROLL_ACTIVATION_THRESHOLD })
    expect(observer.observed).toBe(node)
    expect(node).not.toHaveAttribute("data-active")

    intersect({ isIntersecting: true, intersectionRatio: SCROLL_ACTIVATION_THRESHOLD })
    expect(node).toHaveAttribute("data-active")
    // The 0.35 threshold fires on the way out while any overlap remains.
    // Ratio 0 is not a threshold, so this sliver is the notification that must clear it.
    intersect({ isIntersecting: true, intersectionRatio: 0.2 })
    expect(node).not.toHaveAttribute("data-active")
    intersect({ isIntersecting: true, intersectionRatio: 1 })
    expect(node).toHaveAttribute("data-active")
    intersect(null)
    expect(node).not.toHaveAttribute("data-active")
    intersect({ isIntersecting: false, intersectionRatio: 0 })
    expect(node).not.toHaveAttribute("data-active")

    stop()
    expect(observer.disconnect).toHaveBeenCalledOnce()
  })

  it("stays idle on a wide screen, then follows scroll after the viewport shrinks", () => {
    window.IntersectionObserver = IntersectionStub as unknown as typeof IntersectionObserver
    const query = installMedia(false)
    const node = document.createElement("article")
    node.dataset.active = ""

    bindScrollActivation(node)
    expect(IntersectionStub.instances).toHaveLength(0)
    expect(node).not.toHaveAttribute("data-active")

    act(() => query.setMatches(true))
    expect(IntersectionStub.instances).toHaveLength(1)
    intersect({ isIntersecting: true, intersectionRatio: SCROLL_ACTIVATION_THRESHOLD })
    expect(node).toHaveAttribute("data-active")

    act(() => query.setMatches(false))
    expect(node).not.toHaveAttribute("data-active")
    expect(IntersectionStub.instances[0].disconnect).toHaveBeenCalled()
  })

  it("leaves the card still when the browser cannot observe visibility", () => {
    installMedia(true)
    const node = document.createElement("article")
    node.dataset.active = ""
    bindScrollActivation(node)
    expect(node).not.toHaveAttribute("data-active")
    expect(IntersectionStub.instances).toHaveLength(0)
  })
})

describe("BentoGrid on a small screen", () => {
  it("does not paint the pointer glow while scroll owns the cards", () => {
    installMedia(true)
    render(
      <BentoGrid>
        <article className="bento-card">Kanban</article>
      </BentoGrid>,
    )
    const article = screen.getByRole("article")
    fireEvent.pointerMove(article, { clientX: 40, clientY: 40 })
    expect(article.style.getPropertyValue("--glow")).toBe("")
    expect(article.style.getPropertyValue("--mx")).toBe("")
  })
})

describe("BentoCard on a small screen", () => {
  it("ignores the pointer and lets scrolling reveal the illustration", () => {
    window.IntersectionObserver = IntersectionStub as unknown as typeof IntersectionObserver
    const query = installMedia(true)
    render(<BentoCard index={0} title="Kanban pipeline" body="Move a project." art={<svg />} />)
    const article = screen.getByRole("heading", { name: "Kanban pipeline" }).closest("article")!

    fireEvent.pointerEnter(article, { pointerType: "touch" })
    expect(article).not.toHaveAttribute("data-active")

    intersect({ isIntersecting: true, intersectionRatio: 1 })
    expect(article).toHaveAttribute("data-active")

    fireEvent.pointerLeave(article, { pointerType: "touch" })
    expect(article).toHaveAttribute("data-active")

    act(() => query.setMatches(false))
    expect(article).not.toHaveAttribute("data-active")
    fireEvent.pointerEnter(article, { pointerType: "mouse" })
    expect(article).toHaveAttribute("data-active")
  })
})
