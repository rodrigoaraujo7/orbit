import { afterEach, describe, expect, it, vi } from "vitest"
import { DASH_ORIGIN } from "../dash/index.ts"
import { trustedWebOrigins } from "../../web-origin/index.ts"
import {
  INVALID_AUTH_TRUSTED_ORIGIN,
  resolveAuthTrustedOrigin,
  resolveTrustedOrigins,
} from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("resolveAuthTrustedOrigin", () => {
  it("returns a provided origin and reads AUTH_TRUSTED_ORIGIN from the environment", () => {
    expect(resolveAuthTrustedOrigin("https://abc.example.test")).toBe("https://abc.example.test")
    expect(resolveAuthTrustedOrigin("http://127.0.0.1:9999")).toBe("http://127.0.0.1:9999")
    expect(resolveAuthTrustedOrigin("  https://abc.example.test/path  ")).toBe(
      "https://abc.example.test",
    )
    vi.stubEnv("AUTH_TRUSTED_ORIGIN", " https://from-env.example.test ")
    expect(resolveAuthTrustedOrigin()).toBe("https://from-env.example.test")
  })

  it("treats a missing or blank origin as unset", () => {
    delete process.env.AUTH_TRUSTED_ORIGIN
    expect(resolveAuthTrustedOrigin()).toBeUndefined()
    expect(resolveAuthTrustedOrigin(undefined)).toBeUndefined()
    expect(resolveAuthTrustedOrigin(null)).toBeUndefined()
    expect(resolveAuthTrustedOrigin("")).toBeUndefined()
    expect(resolveAuthTrustedOrigin("   ")).toBeUndefined()
  })

  it("rejects wildcards, lists, and invalid URLs", () => {
    expect(() => resolveAuthTrustedOrigin("https://*.ngrok-free.app")).toThrow(
      INVALID_AUTH_TRUSTED_ORIGIN,
    )
    expect(() => resolveAuthTrustedOrigin("https://a.example.test,https://b.example.test")).toThrow(
      INVALID_AUTH_TRUSTED_ORIGIN,
    )
    expect(() => resolveAuthTrustedOrigin("not a url")).toThrow(INVALID_AUTH_TRUSTED_ORIGIN)
    expect(() => resolveAuthTrustedOrigin("ftp://example.test")).toThrow(
      INVALID_AUTH_TRUSTED_ORIGIN,
    )
    expect(() => resolveAuthTrustedOrigin("https:///")).toThrow(INVALID_AUTH_TRUSTED_ORIGIN)
  })
})

describe("resolveTrustedOrigins", () => {
  it("trusts the web origin by default and never a host wildcard", () => {
    delete process.env.AUTH_TRUSTED_ORIGIN
    expect(resolveTrustedOrigins()).toEqual([...trustedWebOrigins])
    expect(resolveTrustedOrigins(null)).toEqual([...trustedWebOrigins])
    expect(resolveTrustedOrigins()).not.toContain(DASH_ORIGIN)
    expect(resolveTrustedOrigins()).not.toContain("https://*.ngrok-free.app")
    expect(resolveTrustedOrigins().some((origin) => origin.includes("*"))).toBe(false)
  })

  it("appends the dash origin only when it is provided", () => {
    expect(resolveTrustedOrigins(undefined, DASH_ORIGIN)).toEqual([
      ...trustedWebOrigins,
      DASH_ORIGIN,
    ])
    expect(resolveTrustedOrigins(DASH_ORIGIN, DASH_ORIGIN)).toEqual([
      ...trustedWebOrigins,
      DASH_ORIGIN,
    ])
  })

  it("appends a single extra origin and skips duplicates", () => {
    expect(resolveTrustedOrigins("https://tunnel.example.test")).toEqual([
      ...trustedWebOrigins,
      "https://tunnel.example.test",
    ])
    expect(resolveTrustedOrigins("https://tunnel.example.test", DASH_ORIGIN)).toEqual([
      ...trustedWebOrigins,
      DASH_ORIGIN,
      "https://tunnel.example.test",
    ])
    expect(resolveTrustedOrigins(trustedWebOrigins[0])).toEqual([...trustedWebOrigins])
    vi.stubEnv("AUTH_TRUSTED_ORIGIN", "https://from-env.example.test")
    expect(resolveTrustedOrigins()).toContain("https://from-env.example.test")
  })
})
