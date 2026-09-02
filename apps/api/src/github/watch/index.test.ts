import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { WorkflowRun } from "shared"

const { listWorkflowRuns } = vi.hoisted(() => ({ listWorkflowRuns: vi.fn() }))

vi.mock("../client/index.ts", () => ({ listWorkflowRuns }))

import { resetSubscribers, subscribe } from "../events/index.ts"
import { WATCH_INTERVAL_MS, resetWatches, watchCount, watchRuns } from "./index.ts"

function run(id: number, status: WorkflowRun["status"]) {
  return { id, status } as WorkflowRun
}

const target = { userId: "user-a", token: "tok", repo: "ada/portal", branch: "main" }

beforeEach(() => {
  vi.useFakeTimers()
  listWorkflowRuns.mockReset()
  listWorkflowRuns.mockResolvedValue([])
})

afterEach(() => {
  resetWatches()
  resetSubscribers()
  vi.useRealTimers()
})

describe("watchRuns", () => {
  it("records the first sweep without replaying it", async () => {
    const listener = vi.fn()
    subscribe("user-a", listener)
    listWorkflowRuns.mockResolvedValue([run(2, "success"), run(1, "success")])

    watchRuns({ ...target, intervalMs: 1000 })
    await vi.advanceTimersByTimeAsync(0)

    expect(listWorkflowRuns).toHaveBeenCalledWith("tok", "ada/portal", "main", 10)
    expect(listener).not.toHaveBeenCalled()
  })

  it("publishes only the runs whose status moved", async () => {
    const listener = vi.fn()
    subscribe("user-a", listener)
    listWorkflowRuns.mockResolvedValue([run(1, "running")])
    watchRuns({ ...target, intervalMs: 1000 })
    await vi.advanceTimersByTimeAsync(0)

    listWorkflowRuns.mockResolvedValue([run(2, "running"), run(1, "success")])
    await vi.advanceTimersByTimeAsync(1000)

    expect(listener).toHaveBeenCalledTimes(2)
    // oldest first, so a burst arrives in the order it happened
    expect(listener.mock.calls[0][0]).toMatchObject({ run: { id: 1, status: "success" } })
    expect(listener.mock.calls[1][0]).toMatchObject({
      repo: "ada/portal",
      branch: "main",
      source: "poll",
      run: { id: 2 },
    })

    await vi.advanceTimersByTimeAsync(1000)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("survives a failing poll and retries on the next tick", async () => {
    const listener = vi.fn()
    subscribe("user-a", listener)
    listWorkflowRuns.mockRejectedValueOnce(new Error("rate limited"))
    watchRuns({ ...target, intervalMs: 1000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(watchCount()).toBe(1)

    listWorkflowRuns.mockResolvedValue([run(1, "success")])
    await vi.advanceTimersByTimeAsync(1000)
    // the failed sweep never primed the watcher, so this one is still the seed
    expect(listener).not.toHaveBeenCalled()
  })

  it("skips a tick while the previous request is still open", async () => {
    let release: (value: WorkflowRun[]) => void = () => {}
    listWorkflowRuns.mockReturnValueOnce(
      new Promise<WorkflowRun[]>((resolve) => {
        release = resolve
      }),
    )
    watchRuns({ ...target, intervalMs: 1000 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(listWorkflowRuns).toHaveBeenCalledTimes(1)

    release([])
    await vi.advanceTimersByTimeAsync(1000)
    expect(listWorkflowRuns).toHaveBeenCalledTimes(2)
  })

  it("shares one watcher between viewers and stops with the last one", async () => {
    const first = watchRuns({ ...target, intervalMs: 1000 })
    const second = watchRuns({ ...target, intervalMs: 1000 })
    expect(watchCount()).toBe(1)

    first()
    expect(watchCount()).toBe(1)
    second()
    expect(watchCount()).toBe(0)

    await vi.advanceTimersByTimeAsync(5000)
    expect(listWorkflowRuns).toHaveBeenCalledTimes(1)
  })

  it("keeps separate watchers per branch and defaults the interval", async () => {
    watchRuns(target)
    watchRuns({ ...target, branch: "dev" })
    expect(watchCount()).toBe(2)

    await vi.advanceTimersByTimeAsync(WATCH_INTERVAL_MS)
    expect(listWorkflowRuns).toHaveBeenCalledTimes(4)
  })
})
