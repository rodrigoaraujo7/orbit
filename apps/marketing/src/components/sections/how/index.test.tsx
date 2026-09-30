import { readFileSync } from "node:fs"
import path from "node:path"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { How } from "./index"

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

afterEach(() => {
  cleanup()
  IntersectionStub.instances = []
})

describe("How", () => {
  it("lists the three steps in order along a timeline", () => {
    render(<How dictionary={getDictionary("en")} />)
    expect(
      screen.getByRole("heading", { name: "Three steps, then it is your system" }),
    ).toBeInTheDocument()

    const list = screen.getByRole("list")
    expect(list.tagName).toBe("OL")
    expect(list).toHaveClass("how-steps")
    expect(list).not.toHaveAttribute("data-active")

    const items = screen.getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Add a client"),
      expect.stringContaining("Create a project"),
      expect.stringContaining("Track work and billing"),
    ])
    expect(items.map((item) => item.querySelector(".how-node")?.textContent)).toEqual([
      "01",
      "02",
      "03",
    ])
    expect(items.map((item) => item.querySelector(".how-node"))).toEqual([
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      expect.any(HTMLElement),
    ])
    items.forEach((item, index) => {
      expect(item).toHaveStyle({ "--step": String(index) })
    })
    expect(list.querySelectorAll(".how-connector")).toHaveLength(2)
    expect(items[0]?.querySelector(".how-connector-progress")).not.toBeNull()
    expect(items[1]?.querySelector(".how-connector-progress")).not.toBeNull()
    expect(items[2]?.querySelector(".how-connector")).toBeNull()
  })

  it("draws the rail once the steps enter the viewport", () => {
    window.IntersectionObserver = IntersectionStub as unknown as typeof IntersectionObserver
    render(<How dictionary={getDictionary("pt-BR")} />)
    const list = screen.getByRole("list")
    expect(list).not.toHaveAttribute("data-active")
    expect(
      screen.getByRole("heading", { name: "Três passos, e o sistema é seu" }),
    ).toBeInTheDocument()

    const observer = IntersectionStub.instances.at(-1)
    expect(observer).toBeDefined()
    act(() => {
      observer?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      )
    })
    expect(list).toHaveAttribute("data-active", "true")
  })

  it("keeps the finished timeline when motion or scripting is unavailable", () => {
    const css = readFileSync(path.join(import.meta.dirname, "../../../app/globals.css"), "utf8")
    expect(css).toContain(".how-steps[data-active] .how-connector-progress")
    expect(css).toContain(".how-steps[data-active] .how-node")
    expect(css).toContain("transform: scaleY(0)")
    expect(css).toContain("transform: scaleX(0)")
    expect(css).not.toContain("how-node-ping")
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.how-connector-progress[\s\S]*transform: none/,
    )
    expect(css).toMatch(/@media \(scripting: none\)[\s\S]*\.how-step-copy[\s\S]*transform: none/)
  })
})
