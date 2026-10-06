import { afterEach, describe, expect, it, vi } from "vitest"
import { MISSING_DATABASE_URL, resolveDatabaseUrlSecret } from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("resolveDatabaseUrlSecret", () => {
  it("returns a provided url and reads DATABASE_URL from the environment", () => {
    expect(resolveDatabaseUrlSecret("postgres://localhost/test")).toBe("postgres://localhost/test")
    vi.stubEnv("DATABASE_URL", "  postgres:///orbit  ")
    expect(resolveDatabaseUrlSecret()).toBe("postgres:///orbit")
  })

  it("rejects a missing or blank url", () => {
    delete process.env.DATABASE_URL
    expect(() => resolveDatabaseUrlSecret()).toThrow(MISSING_DATABASE_URL)
    expect(() => resolveDatabaseUrlSecret(undefined)).toThrow(MISSING_DATABASE_URL)
    expect(() => resolveDatabaseUrlSecret(null)).toThrow(MISSING_DATABASE_URL)
    expect(() => resolveDatabaseUrlSecret("")).toThrow(MISSING_DATABASE_URL)
    expect(() => resolveDatabaseUrlSecret("   ")).toThrow(MISSING_DATABASE_URL)
  })
})
