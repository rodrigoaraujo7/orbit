import { describe, expect, it } from "vitest"
import { verification } from "../../db/schema/index.ts"
import { closeTestDb, openTestDb } from "../../test/harness.ts"
import {
  isTrustDeviceVerifyPath,
  passwordResetUserId,
  resolveSessionUserId,
  revokeTrustDevices,
  stripTrustDeviceCookie,
  trustDeviceRequested,
  type SessionCookieReader,
} from "./index.ts"

describe("trust device request", () => {
  it("recognizes the verify routes and a boolean trustDevice flag", () => {
    expect(isTrustDeviceVerifyPath("/two-factor/verify-otp")).toBe(true)
    expect(isTrustDeviceVerifyPath("/two-factor/verify-backup-code")).toBe(true)
    expect(isTrustDeviceVerifyPath("/two-factor/verify-totp")).toBe(true)
    expect(isTrustDeviceVerifyPath("/sign-in/email")).toBe(false)

    expect(trustDeviceRequested(undefined)).toBe(false)
    expect(trustDeviceRequested(null)).toBe(false)
    expect(trustDeviceRequested("true")).toBe(false)
    expect(trustDeviceRequested(1)).toBe(false)
    expect(trustDeviceRequested([])).toBe(false)
    expect(trustDeviceRequested({})).toBe(false)
    expect(trustDeviceRequested({ trustDevice: "true" })).toBe(false)
    expect(trustDeviceRequested({ trustDevice: false })).toBe(false)
    expect(trustDeviceRequested({ trustDevice: true })).toBe(true)
  })
})

describe("stripTrustDeviceCookie", () => {
  it("leaves headers alone when no trust cookie is present", () => {
    const missing = new Headers({ "x-request-id": "1" })
    expect(stripTrustDeviceCookie(missing)).toBe(missing)

    const other = new Headers({
      cookie: "better-auth.session_token=abc; theme=dark",
    })
    expect(stripTrustDeviceCookie(other)).toBe(other)
  })

  it("removes every trust-device cookie and keeps the rest", () => {
    const headers = new Headers({
      cookie:
        "stray; trust_device=raw; better-auth.session_token=ab%3Dcd; __Secure-better-auth.trust_device=signed; __Host-better-auth.trust_device=host; better-auth.trust_device_backup=keep; theme=dark",
      "x-request-id": "1",
    })

    const stripped = stripTrustDeviceCookie(headers)

    expect(stripped).not.toBe(headers)
    expect(headers.get("cookie")).toContain("trust_device=raw")
    expect(stripped.get("x-request-id")).toBe("1")
    expect(stripped.get("cookie")).toBe(
      "stray; better-auth.session_token=ab%3Dcd; better-auth.trust_device_backup=keep; theme=dark",
    )
  })

  it("clears the cookie header when trust device was the only cookie", () => {
    const headers = new Headers({
      cookie: "  better-auth.trust_device = signed  ;  ",
    })
    expect(stripTrustDeviceCookie(headers).get("cookie")).toBe("")
  })
})

describe("resolveSessionUserId", () => {
  const reader = async (token: string) => token

  function ctx(overrides: Partial<SessionCookieReader> = {}): SessionCookieReader {
    return {
      context: {},
      ...overrides,
    }
  }

  it("prefers the session already on the hook", async () => {
    await expect(
      resolveSessionUserId(
        ctx({
          context: {
            session: { user: { id: "user-a" } },
            newSession: { user: { id: "user-b" } },
          },
        }),
      ),
    ).resolves.toBe("user-a")
    await expect(
      resolveSessionUserId(ctx({ context: { newSession: { user: { id: "user-b" } } } })),
    ).resolves.toBe("user-b")
  })

  it("returns null without a readable session cookie", async () => {
    await expect(resolveSessionUserId(ctx())).resolves.toBeNull()
    await expect(
      resolveSessionUserId(
        ctx({
          getSignedCookie: reader,
          context: { authCookies: { sessionToken: { name: "better-auth.session_token" } } },
        }),
      ),
    ).resolves.toBeNull()
    await expect(
      resolveSessionUserId(ctx({ getSignedCookie: reader, context: { secret: "secret" } })),
    ).resolves.toBeNull()
  })

  it("returns null when the cookie does not name a session", async () => {
    const secret = "secret"
    const authCookies = { sessionToken: { name: "better-auth.session_token" } }
    const findSession = async () => ({ user: { id: "user-a" } })

    await expect(
      resolveSessionUserId(
        ctx({
          getSignedCookie: async () => false,
          context: { secret, authCookies, internalAdapter: { findSession } },
        }),
      ),
    ).resolves.toBeNull()
    await expect(
      resolveSessionUserId(
        ctx({
          getSignedCookie: async () => "",
          context: { secret, authCookies, internalAdapter: { findSession } },
        }),
      ),
    ).resolves.toBeNull()
    await expect(
      resolveSessionUserId(
        ctx({
          getSignedCookie: async () => "token",
          context: { secret, authCookies },
        }),
      ),
    ).resolves.toBeNull()
    await expect(
      resolveSessionUserId(
        ctx({
          getSignedCookie: async () => "token",
          context: { secret, authCookies, internalAdapter: { findSession: async () => null } },
        }),
      ),
    ).resolves.toBeNull()
  })

  it("reads the user id from the signed session cookie", async () => {
    await expect(
      resolveSessionUserId(
        ctx({
          getSignedCookie: async (name, secret) => {
            expect(name).toBe("better-auth.session_token")
            expect(secret).toBe("secret")
            return "session-token"
          },
          context: {
            secret: "secret",
            authCookies: { sessionToken: { name: "better-auth.session_token" } },
            internalAdapter: {
              findSession: async (token) => {
                expect(token).toBe("session-token")
                return { user: { id: "user-a" } }
              },
            },
          },
        }),
      ),
    ).resolves.toBe("user-a")
  })
})

describe("trust device revocation", () => {
  async function plant(
    db: Awaited<ReturnType<typeof openTestDb>>["db"],
    row: { id: string; identifier: string; value: string; expiresAt?: Date },
  ) {
    await db.insert(verification).values({
      expiresAt: new Date(Date.now() + 60_000),
      ...row,
    })
  }

  it("ignores a missing user and deletes only that user's trust rows", async () => {
    const { db, client } = await openTestDb()
    await revokeTrustDevices(null)
    await plant(db, {
      id: "keep-reset",
      identifier: "reset-password:keep",
      value: "user-a",
    })
    await plant(db, {
      id: "keep-other",
      identifier: "trust-device-other",
      value: "user-b",
    })
    await plant(db, {
      id: "drop-a",
      identifier: "trust-device-a",
      value: "user-a",
    })
    await plant(db, {
      id: "drop-a2",
      identifier: "trust-device-a2",
      value: "user-a",
    })

    await revokeTrustDevices("user-a")

    const rows = await db.select().from(verification)
    expect(rows.map((row) => row.id).sort()).toEqual(["keep-other", "keep-reset"])
    await closeTestDb(client)
  })

  it("resolves a password reset token from the body or the query", async () => {
    const { db, client } = await openTestDb()
    const future = new Date(Date.now() + 60_000)
    const past = new Date(Date.now() - 60_000)
    await plant(db, {
      id: "reset-body",
      identifier: "reset-password:body-token",
      value: "user-a",
      expiresAt: future,
    })
    await plant(db, {
      id: "reset-query",
      identifier: "reset-password:query-token",
      value: "user-b",
      expiresAt: future,
    })
    await plant(db, {
      id: "reset-old",
      identifier: "reset-password:old-token",
      value: "user-c",
      expiresAt: past,
    })

    await expect(passwordResetUserId(null, null)).resolves.toBeNull()
    await expect(passwordResetUserId("nope", null)).resolves.toBeNull()
    await expect(passwordResetUserId({}, null)).resolves.toBeNull()
    await expect(passwordResetUserId({ token: 1 }, null)).resolves.toBeNull()
    await expect(passwordResetUserId({ token: "" }, null)).resolves.toBeNull()
    await expect(passwordResetUserId({ token: "missing" }, null)).resolves.toBeNull()
    await expect(passwordResetUserId({ token: "old-token" }, null)).resolves.toBeNull()
    await expect(
      passwordResetUserId({ token: "body-token" }, { token: "query-token" }),
    ).resolves.toBe("user-a")
    await expect(passwordResetUserId({}, { token: "query-token" })).resolves.toBe("user-b")
    await expect(passwordResetUserId({ token: "" }, { token: "" })).resolves.toBeNull()

    await closeTestDb(client)
  })
})
