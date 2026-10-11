import { Hono } from "hono"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MISSING_BETTER_AUTH_SECRET } from "../auth/secret/index.ts"

const { handler, getAuth } = vi.hoisted(() => {
  const handler = vi.fn(async () => new Response("auth-ok"))
  const getAuth = vi.fn(() => ({ handler }))
  return { handler, getAuth }
})

vi.mock("../auth/index.ts", () => ({ getAuth }))

import { mountApi } from "./index.ts"

describe("mountApi", () => {
  afterEach(() => {
    getAuth.mockReset()
    getAuth.mockImplementation(() => ({ handler }))
    handler.mockClear()
    vi.unstubAllEnvs()
  })
  it("forwards Better Auth and tRPC routes", async () => {
    vi.stubEnv("AUTH_TRUSTED_PROXIES", "76.76.21.0/24")
    const app = new Hono()
    mountApi(app)
    const auth = await app.request("http://localhost/api/auth/ok", {
      headers: {
        "x-real-ip": "76.76.21.22",
        "x-forwarded-for": "1.2.3.4",
        "x-vercel-forwarded-for": "203.0.113.10",
      },
    })
    expect(handler).toHaveBeenCalled()
    const forwarded = handler.mock.calls[0][0] as Request
    expect(forwarded.headers.get("x-forwarded-for")).toBe("203.0.113.10")
    expect(await auth.text()).toBe("auth-ok")

    const trpc = await app.request("/trpc/does-not-exist")
    expect(trpc.status).toBeGreaterThanOrEqual(400)
  })

  it("returns a JSON error when BETTER_AUTH_SECRET is missing or a known insecure default", async () => {
    getAuth.mockImplementationOnce(() => {
      throw new Error(MISSING_BETTER_AUTH_SECRET)
    })
    const app = new Hono()
    mountApi(app)
    const missing = await app.request("/api/auth/ok")
    expect(missing.status).toBe(500)
    expect(await missing.json()).toEqual({ error: MISSING_BETTER_AUTH_SECRET })
    expect(handler).not.toHaveBeenCalled()

    getAuth.mockImplementationOnce(() => {
      throw new Error("BETTER_AUTH_SECRET must not use a known insecure default")
    })
    const insecure = await app.request("/api/auth/ok")
    expect(insecure.status).toBe(500)
    expect(await insecure.json()).toEqual({
      error: "BETTER_AUTH_SECRET must not use a known insecure default",
    })
  })

  it("does not map unrelated setup errors to a missing-secret response", async () => {
    getAuth.mockImplementationOnce(() => {
      throw new Error("db down")
    })
    const app = new Hono()
    mountApi(app)
    const response = await app.request("/api/auth/ok")
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain(MISSING_BETTER_AUTH_SECRET)
  })
})
