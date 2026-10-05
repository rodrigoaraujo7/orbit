import { afterEach, describe, expect, it } from "vitest"
import { bindMarketingHeaderHeight } from "./height"

const HEADER_HEIGHT_PROPERTY = "--marketing-header-height"

class RecordingResizeObserver {
  static latest: RecordingResizeObserver | null = null
  callback: ResizeObserverCallback
  observed: Element[] = []
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    RecordingResizeObserver.latest = this
  }

  observe(target: Element) {
    this.observed.push(target)
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true
  }
}

afterEach(() => {
  document.documentElement.style.removeProperty(HEADER_HEIGHT_PROPERTY)
  Reflect.deleteProperty(window, "ResizeObserver")
  RecordingResizeObserver.latest = null
})

describe("bindMarketingHeaderHeight", () => {
  it("does nothing when the header element is missing", () => {
    expect(bindMarketingHeaderHeight(null)).toBeUndefined()
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_PROPERTY)).toBe("")
  })

  it("writes the header height once when resize observation is unavailable", () => {
    const header = document.createElement("header")
    Object.defineProperty(header, "offsetHeight", { value: 64 })

    expect(bindMarketingHeaderHeight(header)).toBeUndefined()
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_PROPERTY)).toBe("64px")
  })

  it("tracks later resizes and clears the height on cleanup", () => {
    window.ResizeObserver = RecordingResizeObserver as unknown as typeof ResizeObserver
    const header = document.createElement("header")
    Object.defineProperty(header, "offsetHeight", { configurable: true, value: 72 })

    const cleanup = bindMarketingHeaderHeight(header)
    const observer = RecordingResizeObserver.latest

    expect(observer?.observed).toEqual([header])
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_PROPERTY)).toBe("72px")

    Object.defineProperty(header, "offsetHeight", { configurable: true, value: 80 })
    observer?.callback([], observer as unknown as ResizeObserver)
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_PROPERTY)).toBe("80px")

    cleanup?.()
    expect(observer?.disconnected).toBe(true)
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_PROPERTY)).toBe("")
  })
})
