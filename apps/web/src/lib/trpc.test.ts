import { afterEach, describe, expect, it, vi } from "vitest"

describe("trpc client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends credentials on fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: { data: [] } }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const { trpc } = await import("./trpc.ts")
    await trpc.projects.list.query().catch(() => undefined)
    expect(fetchMock).toHaveBeenCalled()
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" })
  })
})
