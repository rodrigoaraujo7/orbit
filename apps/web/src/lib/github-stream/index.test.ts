import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { WorkflowRun } from "shared"
import { STREAM_ENDPOINT, streamUrl, useGithubStream, type GithubRunEvent } from "./index.ts"

/** Minimal EventSource stand-in: jsdom has none, and we need to drive events. */
class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>()
  closed = false

  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  emit(type: string, data = "") {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data } as MessageEvent<string>)
    }
  }

  close() {
    this.closed = true
  }
}

function latest() {
  return FakeEventSource.instances[FakeEventSource.instances.length - 1]
}

const run = { id: 7, status: "running" } as WorkflowRun

function runEvent(source: GithubRunEvent["source"]): GithubRunEvent {
  return { repo: "ada/portal", branch: "main", run, source }
}

beforeEach(() => {
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("streamUrl", () => {
  it("encodes the repository and branch", () => {
    expect(streamUrl("ada/portal", "feat/a b")).toBe(
      `${STREAM_ENDPOINT}?repo=ada%2Fportal&branch=feat%2Fa+b`,
    )
  })
})

describe("useGithubStream", () => {
  it("opens a stream and reports the server is polling", () => {
    const { result } = renderHook(() =>
      useGithubStream({ enabled: true, repo: "ada/portal", branch: "main", onRun: vi.fn() }),
    )
    expect(result.current).toBe("connecting")

    act(() => latest().emit("ready", '{"polling":true}'))
    expect(result.current).toBe("polling")
  })

  it("reports a webhook-only stream as live", () => {
    const { result } = renderHook(() =>
      useGithubStream({ enabled: true, repo: "ada/portal", branch: "main", onRun: vi.fn() }),
    )
    act(() => latest().emit("ready", '{"polling":false}'))
    expect(result.current).toBe("live")
  })

  it("hands every run to the caller and upgrades to live on a webhook", () => {
    const onRun = vi.fn()
    const { result } = renderHook(() =>
      useGithubStream({ enabled: true, repo: "ada/portal", branch: "main", onRun }),
    )
    act(() => latest().emit("ready", '{"polling":true}'))

    act(() => latest().emit("run", JSON.stringify(runEvent("poll"))))
    expect(onRun).toHaveBeenCalledWith(runEvent("poll"))
    expect(result.current).toBe("polling")

    act(() => latest().emit("run", JSON.stringify(runEvent("webhook"))))
    expect(result.current).toBe("live")
    expect(onRun).toHaveBeenCalledTimes(2)
  })

  it("ignores unreadable payloads", () => {
    const onRun = vi.fn()
    const { result } = renderHook(() =>
      useGithubStream({ enabled: true, repo: "ada/portal", branch: "main", onRun }),
    )
    act(() => latest().emit("ready", "not json"))
    expect(result.current).toBe("live")

    act(() => latest().emit("run", "not json"))
    expect(onRun).not.toHaveBeenCalled()
  })

  it("goes offline when the connection drops", () => {
    const { result } = renderHook(() =>
      useGithubStream({ enabled: true, repo: "ada/portal", branch: "main", onRun: vi.fn() }),
    )
    act(() => latest().emit("error"))
    expect(result.current).toBe("offline")
  })

  it("stays closed while disabled", () => {
    const { result } = renderHook(() =>
      useGithubStream({ enabled: false, repo: "ada/portal", branch: "main", onRun: vi.fn() }),
    )
    expect(result.current).toBe("offline")
    expect(FakeEventSource.instances).toHaveLength(0)
  })

  it("stays closed where EventSource does not exist", () => {
    vi.stubGlobal("EventSource", undefined)
    const { result } = renderHook(() =>
      useGithubStream({ enabled: true, repo: "ada/portal", branch: "main", onRun: vi.fn() }),
    )
    expect(result.current).toBe("offline")
  })

  it("reopens on a branch change and closes the old stream", () => {
    const { rerender, unmount } = renderHook(
      ({ branch }) =>
        useGithubStream({ enabled: true, repo: "ada/portal", branch, onRun: vi.fn() }),
      { initialProps: { branch: "main" } },
    )
    const first = latest()

    rerender({ branch: "dev" })
    expect(first.closed).toBe(true)
    expect(latest().url).toContain("branch=dev")

    unmount()
    expect(latest().closed).toBe(true)
  })
})
