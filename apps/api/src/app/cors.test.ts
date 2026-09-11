import { afterEach, describe, expect, it, vi } from "vitest"
import { DASH_ORIGIN } from "../auth/dash/index.ts"
import { trustedWebOrigins } from "../web-origin/index.ts"
import { resolveCorsOrigin } from "./cors.ts"

const strongKey = "ba-infra-3f9c1d7e5a2b8046acde1975"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("resolveCorsOrigin", () => {
  it("allows trusted web origins on every path", () => {
    for (const origin of trustedWebOrigins) {
      expect(resolveCorsOrigin(origin, "/health")).toBe(origin)
      expect(resolveCorsOrigin(origin, "/api/auth/dash/validate")).toBe(origin)
    }
  })

  it("allows the hosted dashboard only on dashboard routes", () => {
    vi.stubEnv("BETTER_AUTH_API_KEY", strongKey)
    expect(resolveCorsOrigin(DASH_ORIGIN, "/api/auth/dash/validate")).toBe(DASH_ORIGIN)
    expect(resolveCorsOrigin(DASH_ORIGIN, "/health")).toBeNull()
    expect(resolveCorsOrigin(DASH_ORIGIN, "/api/auth/sign-in/email")).toBeNull()
    expect(resolveCorsOrigin(DASH_ORIGIN, "/trpc/projects.list")).toBeNull()
  })

  it("drops the hosted dashboard when dash is unmounted", () => {
    vi.stubEnv("BETTER_AUTH_API_KEY", "")
    expect(resolveCorsOrigin(DASH_ORIGIN, "/api/auth/dash/validate")).toBeNull()
    vi.stubEnv("BETTER_AUTH_API_KEY", "dev-key")
    expect(resolveCorsOrigin(DASH_ORIGIN, "/api/auth/dash/validate")).toBeNull()
  })

  it("rejects unknown origins", () => {
    expect(resolveCorsOrigin("https://evil.example", "/health")).toBeNull()
    expect(resolveCorsOrigin("", "/health")).toBeNull()
  })
})
