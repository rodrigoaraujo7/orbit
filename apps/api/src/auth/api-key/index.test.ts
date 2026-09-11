import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveBetterAuthApiKey } from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("resolveBetterAuthApiKey", () => {
  it("returns a provided key and reads BETTER_AUTH_API_KEY from the environment", () => {
    expect(resolveBetterAuthApiKey("dash-key")).toBe("dash-key")
    vi.stubEnv("BETTER_AUTH_API_KEY", "  from-env-key  ")
    expect(resolveBetterAuthApiKey()).toBe("from-env-key")
  })

  it("treats a missing or blank key as unset", () => {
    delete process.env.BETTER_AUTH_API_KEY
    expect(resolveBetterAuthApiKey()).toBeUndefined()
    expect(resolveBetterAuthApiKey(undefined)).toBeUndefined()
    expect(resolveBetterAuthApiKey(null)).toBeUndefined()
    expect(resolveBetterAuthApiKey("")).toBeUndefined()
    expect(resolveBetterAuthApiKey("   ")).toBeUndefined()
  })
})
