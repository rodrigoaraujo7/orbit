import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DASH_ORIGIN,
  DASH_PATH_PREFIX,
  dashKeyStatus,
  isDashPath,
  resolveDashApiKey,
} from "./index.ts"

const strongKey = "ba-infra-3f9c1d7e5a2b8046acde1975"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("dashKeyStatus", () => {
  it("treats absent and blank keys as missing", () => {
    expect(dashKeyStatus(null)).toBe("missing")
    expect(dashKeyStatus("")).toBe("missing")
    expect(dashKeyStatus("   ")).toBe("missing")
  })

  it("treats short, spaced and low-entropy keys as weak", () => {
    expect(dashKeyStatus("dev-key")).toBe("weak")
    expect(dashKeyStatus("a".repeat(31))).toBe("weak")
    expect(dashKeyStatus("abcdefghij klmnopqrstuvwxyz012345")).toBe("weak")
    expect(dashKeyStatus("abcabcabcabcabcabcabcabcabcabcabc")).toBe("weak")
  })

  it("accepts a long high-entropy key", () => {
    expect(strongKey.length).toBeGreaterThanOrEqual(32)
    expect(dashKeyStatus(strongKey)).toBe("ok")
    expect(dashKeyStatus(` ${strongKey} `)).toBe("ok")
  })

  it("reads BETTER_AUTH_API_KEY when no value is given", () => {
    vi.stubEnv("BETTER_AUTH_API_KEY", "")
    expect(dashKeyStatus()).toBe("missing")
    expect(dashKeyStatus(undefined)).toBe("missing")
    vi.stubEnv("BETTER_AUTH_API_KEY", "dev-key")
    expect(dashKeyStatus()).toBe("weak")
    vi.stubEnv("BETTER_AUTH_API_KEY", strongKey)
    expect(dashKeyStatus()).toBe("ok")
  })
})

describe("resolveDashApiKey", () => {
  it("returns the key only when it is strong", () => {
    expect(resolveDashApiKey(null)).toBeUndefined()
    expect(resolveDashApiKey("dev-key")).toBeUndefined()
    expect(resolveDashApiKey(` ${strongKey} `)).toBe(strongKey)
  })

  it("reads BETTER_AUTH_API_KEY when no value is given", () => {
    vi.stubEnv("BETTER_AUTH_API_KEY", "")
    expect(resolveDashApiKey()).toBeUndefined()
    expect(resolveDashApiKey(undefined)).toBeUndefined()
    vi.stubEnv("BETTER_AUTH_API_KEY", strongKey)
    expect(resolveDashApiKey()).toBe(strongKey)
  })
})

describe("isDashPath", () => {
  it("matches the dashboard prefix and nothing else", () => {
    expect(DASH_PATH_PREFIX).toBe("/api/auth/dash")
    expect(isDashPath("/api/auth/dash")).toBe(true)
    expect(isDashPath("/api/auth/dash/validate")).toBe(true)
    expect(isDashPath("/api/auth/dashboard")).toBe(false)
    expect(isDashPath("/api/auth/sign-in/email")).toBe(false)
    expect(isDashPath("/health")).toBe(false)
  })
})

describe("DASH_ORIGIN", () => {
  it("is the hosted Better Auth dashboard", () => {
    expect(DASH_ORIGIN).toBe("https://dash.better-auth.com")
  })
})
