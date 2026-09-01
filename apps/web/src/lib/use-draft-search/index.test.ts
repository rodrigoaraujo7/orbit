import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useDraftSearch } from "./index"

describe("useDraftSearch", () => {
  it("commits trimmed drafts and syncs from the URL", () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const { result, rerender } = renderHook(({ url }) => useDraftSearch(url, commit), {
      initialProps: { url: "acme" as string | undefined },
    })
    expect(result.current[0]).toBe("acme")
    act(() => {
      result.current[1](" ada ")
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(commit).toHaveBeenCalledWith("ada")
    rerender({ url: "from-url" })
    expect(result.current[0]).toBe("from-url")
    act(() => {
      result.current[1]("   ")
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(commit).toHaveBeenCalledWith(undefined)
    vi.useRealTimers()
  })

  it("clears the draft when the URL value is removed", () => {
    const commit = vi.fn()
    const { result, rerender } = renderHook(({ url }) => useDraftSearch(url, commit), {
      initialProps: { url: "acme" as string | undefined },
    })
    rerender({ url: undefined })
    expect(result.current[0]).toBe("")
  })
})
