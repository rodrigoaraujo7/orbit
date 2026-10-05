import { describe, expect, it } from "vitest"
import { apiOrigin, apiRewriteUrl, PRODUCTION_API_ORIGIN } from "./index"

describe("apiOrigin", () => {
  it("sends a PR preview to the API of its Railway PR environment", () => {
    expect(apiOrigin({ VERCEL_ENV: "preview", VERCEL_GIT_PULL_REQUEST_ID: "22" })).toBe(
      "https://api-projects-manager-pr-22.up.railway.app",
    )
  })

  it("falls back to production outside a PR preview", () => {
    expect(apiOrigin({ VERCEL_ENV: "production", VERCEL_GIT_PULL_REQUEST_ID: "22" })).toBe(
      PRODUCTION_API_ORIGIN,
    )
    expect(apiOrigin({ VERCEL_ENV: "preview", VERCEL_GIT_PULL_REQUEST_ID: " " })).toBe(
      PRODUCTION_API_ORIGIN,
    )
    expect(apiOrigin({ VERCEL_ENV: "preview" })).toBe(PRODUCTION_API_ORIGIN)
    expect(apiOrigin({})).toBe(PRODUCTION_API_ORIGIN)
  })
})

describe("apiRewriteUrl", () => {
  it("keeps the path and query and swaps the host", () => {
    const url = apiRewriteUrl("https://web.example.com/trpc/projects.list?batch=1&input=%7B%7D", {
      VERCEL_ENV: "preview",
      VERCEL_GIT_PULL_REQUEST_ID: "7",
    })
    expect(url.href).toBe(
      "https://api-projects-manager-pr-7.up.railway.app/trpc/projects.list?batch=1&input=%7B%7D",
    )
    expect(apiRewriteUrl("https://web.example.com/api/auth/session", {}).href).toBe(
      `${PRODUCTION_API_ORIGIN}/api/auth/session`,
    )
  })
})
