import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Timeline } from "./timeline"

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

afterEach(() => {
  cleanup()
  IntersectionStub.instances = []
})

describe("Timeline", () => {
  it("draws once the list enters the viewport and ignores misses", () => {
    installObserver()
    render(
      <Timeline>
        <li>Add a client</li>
      </Timeline>,
    )
    const list = screen.getByRole("list")
    expect(list).not.toHaveAttribute("data-active")

    const observer = IntersectionStub.instances[0]
    expect(observer).toBeDefined()
    act(() => {
      observer?.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      )
      observer?.callback([], observer as unknown as IntersectionObserver)
    })
    expect(list).not.toHaveAttribute("data-active")

    act(() => {
      observer?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      )
    })
    expect(list).toHaveAttribute("data-active", "true")
    expect(observer?.disconnect).toHaveBeenCalled()
  })

  it("disconnects the observer when the list unmounts", () => {
    installObserver()
    const view = render(
      <Timeline>
        <li>Add a client</li>
      </Timeline>,
    )
    view.unmount()
    expect(IntersectionStub.instances[0]?.disconnect).toHaveBeenCalled()
  })

  it("draws when the browser cannot observe visibility", async () => {
    Reflect.deleteProperty(window, "IntersectionObserver")
    render(
      <Timeline>
        <li>Add a client</li>
      </Timeline>,
    )
    expect(screen.getByRole("list")).not.toHaveAttribute("data-active")
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    })
    expect(screen.getByRole("list")).toHaveAttribute("data-active", "true")
  })
})
