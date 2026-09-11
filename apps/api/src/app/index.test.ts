import { afterEach, describe, expect, it, vi } from "vitest"
import { DASH_ORIGIN } from "../auth/dash/index.ts"
import { trustedWebOrigins } from "../web-origin/index.ts"
import { app } from "./index.ts"

const strongKey = "ba-infra-3f9c1d7e5a2b8046acde1975"

function preflight(path: string, origin: string) {
  return app.request(path, {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "GET" },
  })
}

describe("app", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("serves /health with secure headers", async () => {
    const health = await app.request("/health")
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ ok: true })
    expect(health.headers.get("x-content-type-options")).toBe("nosniff")
    expect(health.headers.get("x-frame-options")).toBeTruthy()
  })

  it("returns a JSON 404", async () => {
    const missing = await app.request("/nope")
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: "not_found" })
  })

  it("answers CORS preflight from trusted web origins", async () => {
    for (const origin of trustedWebOrigins) {
      const response = await preflight("/health", origin)
      expect(response.status).toBeLessThan(500)
      expect(response.headers.get("access-control-allow-origin")).toBe(origin)
    }
  })

  it("scopes the hosted dashboard origin to the dashboard routes", async () => {
    vi.stubEnv("BETTER_AUTH_API_KEY", strongKey)
    const dashRoute = await preflight("/api/auth/dash/validate", DASH_ORIGIN)
    expect(dashRoute.headers.get("access-control-allow-origin")).toBe(DASH_ORIGIN)

    for (const path of ["/health", "/api/auth/sign-in/email", "/trpc/projects.list"]) {
      const response = await preflight(path, DASH_ORIGIN)
      expect(response.headers.get("access-control-allow-origin")).toBeNull()
    }
  })

  it("refuses the hosted dashboard origin while dash is unmounted", async () => {
    vi.stubEnv("BETTER_AUTH_API_KEY", "")
    const response = await preflight("/api/auth/dash/validate", DASH_ORIGIN)
    expect(response.headers.get("access-control-allow-origin")).toBeNull()
  })
})
