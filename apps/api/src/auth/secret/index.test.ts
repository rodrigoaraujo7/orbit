import { afterEach, describe, expect, it, vi } from "vitest"
import { INSECURE_BETTER_AUTH_SECRET, resolveBetterAuthSecret } from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("resolveBetterAuthSecret", () => {
  it("returns a provided secret and reads BETTER_AUTH_SECRET from the environment", () => {
    expect(resolveBetterAuthSecret("unit-test-better-auth-secret")).toBe(
      "unit-test-better-auth-secret",
    )
    vi.stubEnv("BETTER_AUTH_SECRET", "from-env-better-auth-secret")
    expect(resolveBetterAuthSecret()).toBe("from-env-better-auth-secret")
  })

  it("rejects a missing, empty, or known insecure default secret", () => {
    expect(() => resolveBetterAuthSecret(undefined)).toThrow(/missing env BETTER_AUTH_SECRET/)
    expect(() => resolveBetterAuthSecret(null)).toThrow(/missing env BETTER_AUTH_SECRET/)
    expect(() => resolveBetterAuthSecret("")).toThrow(/missing env BETTER_AUTH_SECRET/)
    delete process.env.BETTER_AUTH_SECRET
    expect(() => resolveBetterAuthSecret()).toThrow(/missing env BETTER_AUTH_SECRET/)
    expect(() => resolveBetterAuthSecret(INSECURE_BETTER_AUTH_SECRET)).toThrow(
      /known insecure default/,
    )
    vi.stubEnv("BETTER_AUTH_SECRET", INSECURE_BETTER_AUTH_SECRET)
    expect(() => resolveBetterAuthSecret()).toThrow(/known insecure default/)
  })
})
