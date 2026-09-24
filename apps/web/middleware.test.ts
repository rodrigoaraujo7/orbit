import { afterEach, describe, expect, it, vi } from "vitest"
import middleware, { config } from "./middleware"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("vercel middleware", () => {
  it("only runs for the API and tRPC paths", () => {
    expect(config.matcher).toEqual(["/api/:path*", "/trpc/:path*"])
  })

  it("proxies a PR preview request to that PR's API", async () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_PULL_REQUEST_ID", "23")
    const fetchMock = vi.fn(async () => new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)
    const request = new Request("https://preview.example.com/trpc/projects.list?batch=1", {
      method: "POST",
      body: "{}",
    })

    await middleware(request)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(String(url)).toBe(
      "https://api-projects-manager-pr-23.up.railway.app/trpc/projects.list?batch=1",
    )
    expect(init.method).toBe("POST")
    expect(init.redirect).toBe("manual")
    expect(new Headers(init.headers).get("host")).toBeNull()
  })

  it("proxies a production request to the production API", async () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("VERCEL_GIT_PULL_REQUEST_ID", "")
    const fetchMock = vi.fn(async () => new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await middleware(new Request("https://app.example.com/api/auth/session"))

    const [url] = fetchMock.mock.calls[0] as [URL]
    expect(String(url)).toBe("https://api-production-b70f.up.railway.app/api/auth/session")
  })
})
