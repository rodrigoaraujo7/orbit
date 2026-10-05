import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getDictionary } from "@/i18n"
import { SECURITY_CYCLE_MS } from "./cycle"
import { Security } from "./index"

const BODIES = [
  "Every row belongs to your account. Another user cannot read your clients, projects, or invoices.",
  "Tool credentials are sealed before they are stored, and stay attached to the project that uses them.",
  "A password is not enough. Each login also needs a six-digit code sent to your inbox.",
]

function tab(name: RegExp) {
  return screen.getByRole("tab", { name })
}

function stage() {
  return screen.getByRole("tabpanel")
}

function installMedia(matches: boolean | ((query: string) => boolean)) {
  const listeners = new Set<() => void>()
  const media = {
    get matches() {
      return typeof matches === "function" ? matches("") : matches
    },
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
  }
  window.matchMedia = vi.fn((query: string) => {
    const resolved = typeof matches === "function" ? matches(query) : matches
    return {
      ...media,
      matches: resolved,
      addEventListener: media.addEventListener,
      removeEventListener: media.removeEventListener,
    }
  }) as unknown as typeof window.matchMedia
  return {
    listeners,
    emit() {
      for (const listener of listeners) listener()
    },
  }
}

class IntersectionStub {
  static instances: IntersectionStub[] = []
  callback: IntersectionObserverCallback
  disconnect = vi.fn()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    IntersectionStub.instances.push(this)
  }

  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

function installObserver() {
  window.IntersectionObserver = IntersectionStub as unknown as typeof IntersectionObserver
}

/** Lets the cycle start in browsers that cannot observe visibility. */
async function settleSeen() {
  await act(async () => {
    await Promise.resolve()
  })
}

function emitVisibility(isIntersecting: boolean | null) {
  const observer = IntersectionStub.instances.at(-1)
  if (!observer) throw new Error("missing observer")
  act(() => {
    observer.callback(
      isIntersecting === null ? [] : [{ isIntersecting } as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    )
  })
  return observer
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  IntersectionStub.instances = []
  Reflect.deleteProperty(window, "matchMedia")
  Reflect.deleteProperty(window, "IntersectionObserver")
})

describe("Security", () => {
  it("keeps isolation, encryption, and the sign-in code on the console", async () => {
    render(<Security dictionary={getDictionary("en")} />)
    await settleSeen()

    expect(screen.getByRole("heading", { name: "Isolated by default" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Per-user isolation" })).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Envelope encryption for secrets" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "An email code on every sign-in" }),
    ).toBeInTheDocument()
    for (const body of BODIES) expect(screen.getByText(body)).toBeInTheDocument()

    expect(tab(/Per-user isolation/)).toHaveAttribute("aria-selected", "true")
    expect(stage()).toHaveClass("security-stage", "lg:h-full", "lg:min-h-0")
    expect(stage().parentElement).toHaveClass("lg:items-stretch")
    expect(stage()).toHaveAttribute("data-scene", "isolation")
    expect(stage().querySelector("[data-part='shield']")).not.toBeNull()
    const phones = stage().querySelectorAll("[data-part='phone']")
    const you = phones[0]
    const other = phones[1]
    const youRight = Number(you?.getAttribute("x")) + Number(you?.getAttribute("width"))
    const otherLeft = Number(other?.getAttribute("x"))
    expect(otherLeft - youRight).toBeGreaterThan(160)
    expect(stage().querySelector("[data-part='meter']")).toBeNull()
    expect(tab(/Per-user isolation/).querySelector("[data-part='meter']")).toHaveClass(
      "security-meter",
    )
  })

  it("does not start the cycle after the section has gone", async () => {
    const view = render(<Security dictionary={getDictionary("en")} />)
    view.unmount()
    await settleSeen()
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument()
  })

  it("keeps the current control on hover and selects another on click", () => {
    render(<Security dictionary={getDictionary("en")} />)

    fireEvent.pointerEnter(tab(/Envelope encryption/))
    expect(tab(/Per-user isolation/)).toHaveAttribute("aria-selected", "true")
    expect(stage()).toHaveAttribute("data-scene", "isolation")

    fireEvent.click(tab(/Envelope encryption/))
    expect(tab(/Envelope encryption/)).toHaveAttribute("aria-selected", "true")
    expect(stage()).toHaveAttribute("data-scene", "encryption")
    expect(stage().querySelector("[data-part='chip']")).toHaveClass("security-chip")
    expect(stage().querySelector("[data-part='stamp']")).toHaveClass("security-stamp")

    fireEvent.click(tab(/An email code/))
    expect(stage()).toHaveAttribute("data-scene", "emailCode")
    expect(stage().querySelectorAll("[data-part='digit']")).toHaveLength(6)
    expect(stage().querySelector("[data-part='mail-path']")).toHaveClass("security-draw")
  })

  it("moves the selection from the keyboard and ignores other keys", () => {
    render(<Security dictionary={getDictionary("en")} />)
    const list = screen.getByRole("tablist")

    fireEvent.keyDown(list, { key: "ArrowDown" })
    expect(tab(/Envelope encryption/)).toHaveFocus()
    expect(stage()).toHaveAttribute("data-scene", "encryption")

    fireEvent.keyDown(list, { key: "End" })
    expect(tab(/An email code/)).toHaveFocus()

    fireEvent.keyDown(list, { key: "Home" })
    expect(tab(/Per-user isolation/)).toHaveFocus()

    fireEvent.keyDown(list, { key: "ArrowLeft" })
    expect(stage()).toHaveAttribute("data-scene", "emailCode")

    fireEvent.keyDown(list, { key: "a" })
    expect(stage()).toHaveAttribute("data-scene", "emailCode")
  })

  it("pauses on hover without resetting and resumes the time that is left", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    })
    render(<Security dictionary={getDictionary("en")} />)
    await settleSeen()
    const console = screen.getByRole("tablist").parentElement!
    const elapsed = 3_000

    act(() => {
      vi.advanceTimersByTime(elapsed)
    })
    expect(stage()).toHaveAttribute("data-scene", "isolation")

    fireEvent.pointerEnter(console)
    fireEvent.pointerEnter(stage())
    expect(tab(/Per-user isolation/).querySelector("[data-part='meter']")).toHaveStyle({
      animationPlayState: "paused",
    })
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS * 2)
    })
    expect(stage()).toHaveAttribute("data-scene", "isolation")

    fireEvent.pointerLeave(console)
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS - elapsed - 1)
    })
    expect(stage()).toHaveAttribute("data-scene", "isolation")
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(stage()).toHaveAttribute("data-scene", "encryption")

    fireEvent.focus(console)
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "encryption")

    fireEvent.blur(console, { relatedTarget: tab(/Envelope encryption/) })
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "encryption")

    fireEvent.blur(console, { relatedTarget: document.body })
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "emailCode")
  })

  it("starts the cycle the first time the section enters view", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    installObserver()
    const view = render(<Security dictionary={getDictionary("en")} />)
    const meter = () => tab(/Per-user isolation/).querySelector("[data-part='meter']")

    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "isolation")
    expect(meter()).toHaveClass("scale-x-100")
    expect(meter()).not.toHaveClass("security-meter")

    emitVisibility(false)
    emitVisibility(null)
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "isolation")

    const observer = emitVisibility(true)
    expect(meter()).toHaveClass("security-meter")
    expect(observer.disconnect).toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "encryption")

    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "emailCode")

    view.unmount()
  })

  it("stays on the selected control when motion is reduced, including after a change", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    const media = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    window.matchMedia = vi.fn(() => media) as unknown as typeof window.matchMedia

    const view = render(<Security dictionary={getDictionary("en")} />)
    await settleSeen()
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS * 3)
    })
    expect(stage()).toHaveAttribute("data-scene", "isolation")
    expect(tab(/Per-user isolation/).querySelector("[data-part='meter']")).not.toHaveClass(
      "security-meter",
    )

    media.matches = false
    const sync = media.addEventListener.mock.calls[0]?.[1] as () => void
    act(() => sync())
    act(() => {
      vi.advanceTimersByTime(SECURITY_CYCLE_MS)
    })
    expect(stage()).toHaveAttribute("data-scene", "encryption")

    view.unmount()
    expect(media.removeEventListener).toHaveBeenCalled()
  })

  it("follows the pointer across the stage and resets when the pointer leaves", () => {
    render(<Security dictionary={getDictionary("en")} />)
    const panel = stage()
    panel.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 100 }) as DOMRect

    fireEvent.pointerEnter(panel, { pointerType: "mouse" })
    expect(panel).toHaveAttribute("data-active")
    fireEvent.pointerMove(panel, { clientX: 160, clientY: 45 })
    expect(panel.style.getPropertyValue("--mx")).toBe("150px")
    expect(panel.style.getPropertyValue("--my")).toBe("25px")

    fireEvent.pointerLeave(panel, { pointerType: "mouse" })
    expect(panel).not.toHaveAttribute("data-active")
    expect(panel.style.getPropertyValue("--mx")).toBe("")
  })

  it("keeps a tapped stage revealed", () => {
    render(<Security dictionary={getDictionary("en")} />)
    const panel = stage()

    fireEvent.pointerEnter(panel, { pointerType: "touch" })
    fireEvent.pointerLeave(panel, { pointerType: "touch" })
    expect(panel).toHaveAttribute("data-active")
  })

  it("lets scroll own the stage below the wide layout", () => {
    installMedia((query) => query.includes("max-width"))
    render(<Security dictionary={getDictionary("en")} />)
    const panel = stage()

    fireEvent.pointerEnter(panel, { pointerType: "mouse" })
    expect(panel).not.toHaveAttribute("data-active")
    fireEvent.pointerMove(panel, { clientX: 4, clientY: 4 })
    fireEvent.pointerLeave(panel, { pointerType: "mouse" })
    expect(panel.style.getPropertyValue("--mx")).toBe("")
    expect(panel).not.toHaveAttribute("data-active")
  })
})
