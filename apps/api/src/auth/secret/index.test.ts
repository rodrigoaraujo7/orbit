import { afterEach, describe, expect, it, vi } from "vitest"
import {
  BETTER_AUTH_LIBRARY_DEFAULT_SECRET,
  INSECURE_BETTER_AUTH_SECRET,
  MISSING_BETTER_AUTH_SECRET,
  isBetterAuthSecretError,
  resolveBetterAuthSecret,
} from "./index.ts"

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

  it("rejects a missing, blank, or known insecure default instead of falling back", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "from-env-better-auth-secret")
    expect(() => resolveBetterAuthSecret(undefined)).toThrow(MISSING_BETTER_AUTH_SECRET)
    expect(() => resolveBetterAuthSecret(null)).toThrow(MISSING_BETTER_AUTH_SECRET)
    expect(() => resolveBetterAuthSecret("")).toThrow(MISSING_BETTER_AUTH_SECRET)
    expect(() => resolveBetterAuthSecret("   ")).toThrow(MISSING_BETTER_AUTH_SECRET)
    expect(resolveBetterAuthSecret()).toBe("from-env-better-auth-secret")

    vi.stubEnv("BETTER_AUTH_SECRET", undefined)
    expect(() => resolveBetterAuthSecret()).toThrow(MISSING_BETTER_AUTH_SECRET)
    expect(() => resolveBetterAuthSecret(INSECURE_BETTER_AUTH_SECRET)).toThrow(
      /known insecure default/,
    )
    expect(() => resolveBetterAuthSecret(BETTER_AUTH_LIBRARY_DEFAULT_SECRET)).toThrow(
      /known insecure default/,
    )
    vi.stubEnv("BETTER_AUTH_SECRET", INSECURE_BETTER_AUTH_SECRET)
    expect(() => resolveBetterAuthSecret()).toThrow(/known insecure default/)
    expect(() => resolveBetterAuthSecret(undefined)).toThrow(MISSING_BETTER_AUTH_SECRET)
  })

  it("identifies secret configuration errors", () => {
    expect(isBetterAuthSecretError(new Error(MISSING_BETTER_AUTH_SECRET))).toBe(true)
    expect(
      isBetterAuthSecretError(
        new Error("BETTER_AUTH_SECRET must not use a known insecure default"),
      ),
    ).toBe(true)
    expect(isBetterAuthSecretError(new Error("missing env DATABASE_URL"))).toBe(false)
    expect(isBetterAuthSecretError("missing env BETTER_AUTH_SECRET")).toBe(false)
  })
})
