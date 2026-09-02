import { afterEach, describe, expect, it, vi } from "vitest"
import type { WorkflowRun } from "shared"
import { publish, resetSubscribers, subscribe, subscriberCount } from "./index.ts"

const run = { id: 1, status: "running" } as WorkflowRun
const event = { repo: "ada/portal", branch: "main", run, source: "poll" } as const

afterEach(() => {
  resetSubscribers()
})

describe("github event bus", () => {
  it("delivers to every stream a user has open", () => {
    const first = vi.fn()
    const second = vi.fn()
    subscribe("user-a", first)
    subscribe("user-a", second)

    expect(publish("user-a", event)).toBe(2)
    expect(first).toHaveBeenCalledWith(event)
    expect(second).toHaveBeenCalledWith(event)
  })

  it("never crosses users and ignores an empty audience", () => {
    const listener = vi.fn()
    subscribe("user-a", listener)
    expect(publish("user-b", event)).toBe(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it("forgets a listener once it unsubscribes", () => {
    const listener = vi.fn()
    const unsubscribe = subscribe("user-a", listener)
    expect(subscriberCount("user-a")).toBe(1)

    unsubscribe()
    expect(subscriberCount("user-a")).toBe(0)
    expect(publish("user-a", event)).toBe(0)
  })

  it("keeps the group while another stream is still attached", () => {
    const unsubscribe = subscribe("user-a", vi.fn())
    subscribe("user-a", vi.fn())
    unsubscribe()
    expect(subscriberCount("user-a")).toBe(1)
  })

  it("resets every subscription", () => {
    subscribe("user-a", vi.fn())
    resetSubscribers()
    expect(subscriberCount("user-a")).toBe(0)
  })
})
