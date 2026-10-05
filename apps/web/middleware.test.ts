import { afterEach, describe, expect, it, vi } from "vitest"
import middleware, { config } from "./middleware"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("vercel middleware", () => {
  it("only runs for the API and tRPC paths", () => {
    expect(config.matcher).toEqual(["/api/:path*", "/trpc/:path*"])
  })

  it("rewrites a PR preview request to that PR's API", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_PULL_REQUEST_ID", "23")
    const request = new Request("https://preview.example.com/trpc/projects.list?batch=1")

    const response = middleware(request)

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://api-projects-manager-pr-23.up.railway.app/trpc/projects.list?batch=1",
    )
  })

  it("rewrites a production request to the production API", () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("VERCEL_GIT_PULL_REQUEST_ID", "")

    const response = middleware(new Request("https://app.example.com/api/auth/session"))

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://api-production-b70f.up.railway.app/api/auth/session",
    )
  })
})
