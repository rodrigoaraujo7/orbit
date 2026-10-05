import { readFileSync } from "node:fs"
import path from "node:path"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Reveal } from "./reveal"

class IntersectionStub {
  static instances: IntersectionStub[] = []
  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    IntersectionStub.instances.push(this)
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function installObserver() {
  window.IntersectionObserver = IntersectionStub as unknown as typeof IntersectionObserver
}

function enterView(isIntersecting = true) {
  const observer = IntersectionStub.instances.at(-1)
  if (!observer) throw new Error("missing observer")
  act(() => {
    observer.callback(
      isIntersecting
        ? [{ isIntersecting: true } as IntersectionObserverEntry]
        : [{ isIntersecting: false } as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    )
    if (!isIntersecting) observer.callback([], observer as unknown as IntersectionObserver)
  })
}

afterEach(() => {
  IntersectionStub.instances = []
})

describe("Reveal", () => {
  it("fades a section in on a timer once it enters the viewport", () => {
    installObserver()
    render(
      <Reveal delay={70}>
        <h2>Scattered work</h2>
      </Reveal>,
    )
    const section = screen.getByRole("heading", { name: "Scattered work" }).parentElement
    expect(section).toHaveClass("marketing-reveal")
    expect(section).not.toHaveClass("marketing-reveal-in")
    expect(section).toHaveStyle({ transitionDelay: "70ms" })
    enterView(false)
    expect(section).not.toHaveClass("marketing-reveal-in")
    enterView(true)
    expect(section).toHaveClass("marketing-reveal-in")
  })

  it("plays the hero entrance on load without waiting for scroll", () => {
    installObserver()
    render(
      <Reveal immediate delay={140}>
        <h2>Later</h2>
      </Reveal>,
    )
    const section = screen.getByRole("heading", { name: "Later" }).parentElement
    expect(section).toHaveClass("marketing-reveal-immediate")
    expect(section).not.toHaveClass("marketing-reveal-in")
    expect(section).toHaveStyle({ animationDelay: "140ms" })
    expect(IntersectionStub.instances).toHaveLength(0)
  })

  it("can reveal a list item and stops watching after unmount", () => {
    const disconnect = vi.fn()
    window.IntersectionObserver = class extends IntersectionStub {
      disconnect() {
        disconnect()
      }
    } as unknown as typeof IntersectionObserver
    const view = render(
      <ul>
        <Reveal as="li">
          <span>Step</span>
        </Reveal>
      </ul>,
    )
    expect(screen.getByRole("listitem").tagName).toBe("LI")
    view.unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it("shows the section when the browser cannot observe visibility", async () => {
    Reflect.deleteProperty(window, "IntersectionObserver")
    const view = render(
      <Reveal>
        <h2>Fallback</h2>
      </Reveal>,
    )
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    })
    expect(screen.getByRole("heading", { name: "Fallback" }).parentElement).toHaveClass(
      "marketing-reveal-in",
    )
    view.unmount()
  })

  it("keeps reduced motion from hiding the section", () => {
    const css = readFileSync(path.join(import.meta.dirname, "../app/globals.css"), "utf8")
    expect(css).toContain(".marketing-reveal.marketing-reveal-in")
    expect(css).toContain("transition-property: opacity, transform")
    expect(css).toContain("@keyframes marketing-rise")
    expect(css).not.toContain("animation-timeline: view()")
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*opacity: 1/)
  })
})
