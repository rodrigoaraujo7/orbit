import { readFile } from "node:fs/promises"
import { APIError } from "better-auth/api"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { auditLog, session as sessionTable, user as userTable } from "../db/schema/index.ts"
import { validation } from "../input/messages.ts"
import {
  authRequestWithClientIp,
  INVALID_AUTH_TRUSTED_PROXIES,
  VERCEL_PROXY_CIDRS,
} from "./client-ip/index.ts"
import {
  afterAuthHook,
  assertSignupPasswordConfirmation,
  beforeAuthHook,
  createAuth,
  emailRecipient,
  enableTwoFactorOnCreate,
  getAuth,
  resetAuth,
  sendResetPasswordEmail,
  sendTwoFactorOtp,
  sendVerificationEmailFor,
  syntheticSignupUser,
} from "./index.ts"
import { DASH_ORIGIN } from "./dash/index.ts"
import { INSECURE_BETTER_AUTH_SECRET } from "./secret/index.ts"
import { closeTestDb, insertUser, openTestDb } from "../test/harness.ts"
import { withUser } from "../db/with-user/index.ts"
import { dbHolder } from "../test/setup.ts"
import {
  sendAccountConfirmation,
  sendLoginOtp,
  sendNewLoginAlert,
  sendPasswordReset,
} from "../email/send/index.ts"

vi.mock("../email/send/index.ts", () => ({
  sendAccountConfirmation: vi.fn(async () => {}),
  sendLoginOtp: vi.fn(async () => {}),
  sendNewLoginAlert: vi.fn(async () => {}),
  sendPasswordReset: vi.fn(async () => {}),
}))

const STRONG_DASH_KEY = "ba-infra-3f9c1d7e5a2b8046acde1975"

beforeEach(() => {
  vi.mocked(sendAccountConfirmation).mockClear()
  vi.mocked(sendLoginOtp).mockClear()
  vi.mocked(sendNewLoginAlert).mockClear()
  vi.mocked(sendPasswordReset).mockClear()
})

type AuthInstance = ReturnType<typeof createAuth>

function pluginIds(auth: AuthInstance) {
  return (auth.options.plugins ?? []).map((plugin) => plugin.id)
}

function dashEndpointPaths(auth: AuthInstance) {
  return Object.values(auth.api as Record<string, { path?: unknown }>)
    .map((endpoint) => endpoint.path)
    .filter((path): path is string => typeof path === "string" && path.startsWith("/dash"))
}

describe("createAuth", () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  it("uses a singleton once BETTER_AUTH_SECRET is set", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const first = getAuth()
    expect(getAuth()).toBe(first)
    resetAuth()
    await closeTestDb(client)
  })

  it("requires BETTER_AUTH_SECRET in every environment", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("NODE_ENV", "test")
    delete process.env.BETTER_AUTH_SECRET
    expect(() => createAuth()).toThrow(/missing env BETTER_AUTH_SECRET/)
    vi.stubEnv("BETTER_AUTH_SECRET", "   ")
    expect(() => createAuth()).toThrow(/missing env BETTER_AUTH_SECRET/)
    vi.stubEnv("NODE_ENV", "production")
    expect(() => createAuth()).toThrow(/missing env BETTER_AUTH_SECRET/)
    vi.stubEnv("BETTER_AUTH_SECRET", "prod-secret-must-be-long-enough")
    expect(createAuth()).toBeTruthy()
    resetAuth()
    await closeTestDb(client)
  })

  it("does not fall back to the known insecure default secret", async () => {
    const src = await readFile(new URL("./index.ts", import.meta.url), "utf8")
    expect(src).not.toContain(INSECURE_BETTER_AUTH_SECRET)

    const { client } = await openTestDb()
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("BETTER_AUTH_SECRET", INSECURE_BETTER_AUTH_SECRET)
    expect(() => createAuth()).toThrow(/known insecure default/)
    resetAuth()
    await closeTestDb(client)
  })

  it("creates auth when the origin is https", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com")
    expect(createAuth()).toBeTruthy()
    resetAuth()
    await closeTestDb(client)
  })

  it("does not trust every ngrok-free.app host", async () => {
    const src = await readFile(new URL("./index.ts", import.meta.url), "utf8")
    expect(src).not.toContain("*.ngrok-free.app")
    expect(src).not.toContain("ngrok")

    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("AUTH_TRUSTED_ORIGIN", "https://*.ngrok-free.app")
    expect(() => createAuth()).toThrow(/AUTH_TRUSTED_ORIGIN/)
    vi.stubEnv("AUTH_TRUSTED_ORIGIN", "https://abc.ngrok-free.app")
    expect(createAuth()).toBeTruthy()
    resetAuth()
    await closeTestDb(client)
  })

  it("leaves the dash admin surface unmounted without a strong BETTER_AUTH_API_KEY", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")

    for (const key of ["", "dev-key", "a".repeat(40)]) {
      vi.stubEnv("BETTER_AUTH_API_KEY", key)
      const auth = createAuth()
      expect(pluginIds(auth)).not.toContain("dash")
      expect(dashEndpointPaths(auth)).toEqual([])
      expect(auth.options.trustedOrigins).not.toContain(DASH_ORIGIN)
      resetAuth()
    }

    await closeTestDb(client)
  })

  it("trusts the rewrite proxies when keying auth rate limits", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    delete process.env.AUTH_TRUSTED_PROXIES
    expect(createAuth().options.advanced?.ipAddress?.trustedProxies).toEqual([
      ...VERCEL_PROXY_CIDRS,
    ])
    expect(createAuth().options.advanced?.ipAddress?.ipAddressHeaders).toEqual(["x-forwarded-for"])
    resetAuth()

    vi.stubEnv("AUTH_TRUSTED_PROXIES", "203.0.113.0/24")
    expect(createAuth().options.advanced?.ipAddress?.trustedProxies).toEqual(["203.0.113.0/24"])
    resetAuth()

    vi.stubEnv("AUTH_TRUSTED_PROXIES", "nope")
    expect(() => createAuth()).toThrow(INVALID_AUTH_TRUSTED_PROXIES)
    resetAuth()
    await closeTestDb(client)
  })

  it("gives each visitor behind the rewrite hop its own sign-in limit", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:5173")
    vi.stubEnv("AUTH_TRUSTED_PROXIES", "76.76.21.0/24")
    const auth = createAuth({ rateLimitEnabled: true })

    const signIn = (visitor: string, peer = "76.76.21.22") =>
      auth.handler(
        authRequestWithClientIp(
          new Request("http://localhost:5173/api/auth/sign-in/email", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:5173",
              "x-real-ip": peer,
              "x-forwarded-for": peer,
              "x-vercel-forwarded-for": visitor,
            },
            body: JSON.stringify({
              email: "nobody@test.local",
              password: "not-a-real-password",
            }),
          }),
        ),
      )

    const firstVisitor = []
    for (let attempt = 0; attempt < 4; attempt++) firstVisitor.push(await signIn("203.0.113.10"))
    expect(firstVisitor.map((response) => response.status)).toEqual([401, 401, 401, 429])
    const limited = firstVisitor[3]
    if (!limited) throw new Error("missing limited response")
    expect(Number(limited.headers.get("x-retry-after"))).toBeGreaterThan(0)
    expect(await limited.json()).toEqual({
      message: "Too many requests. Please try again later.",
    })

    const secondVisitor = []
    for (let attempt = 0; attempt < 3; attempt++) {
      secondVisitor.push((await signIn("203.0.113.99")).status)
    }
    expect(secondVisitor).toEqual([401, 401, 401])

    const spoofed = await signIn("203.0.113.10", "198.51.100.7")
    expect(spoofed.status).toBe(401)

    resetAuth()
    await closeTestDb(client)
  })

  it("mounts the dash admin surface with a strong BETTER_AUTH_API_KEY", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    vi.stubEnv("BETTER_AUTH_API_KEY", STRONG_DASH_KEY)

    const auth = createAuth()
    expect(pluginIds(auth)).toContain("dash")
    expect(dashEndpointPaths(auth).length).toBeGreaterThan(0)
    expect(auth.options.trustedOrigins).toContain(DASH_ORIGIN)

    resetAuth()
    await closeTestDb(client)
  })
})

describe("afterAuthHook", () => {
  afterEach(async () => {
    vi.unstubAllEnvs()
  })

  it("records login, failure, logout, password and 2FA events", async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, "user-a", "ada@test.local")
    const headers = new Headers({ "x-forwarded-for": "10.0.0.2", "user-agent": "hook" })

    await afterAuthHook({
      path: "/two-factor/verify-otp",
      headers,
      context: { newSession: { user: { id: "user-a", email: "ada@test.local" } } },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      request: { headers },
      body: "nope",
      context: { returned: new APIError("UNAUTHORIZED", { message: "no" }) },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      body: { email: "" },
      context: { returned: new APIError("UNAUTHORIZED", { message: "no" }) },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      body: { email: undefined },
      context: { returned: new APIError("UNAUTHORIZED", { message: "no" }) },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      body: { email: null },
      context: { returned: new APIError("UNAUTHORIZED", { message: "no" }) },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      body: { email: "ghost@test.local" },
      context: { returned: new APIError("UNAUTHORIZED", { message: "no" }) },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      headers,
      body: { email: "ada@test.local" },
      context: { returned: new APIError("UNAUTHORIZED", { message: "no" }) },
    })
    await afterAuthHook({
      path: "/sign-in/email",
      context: {},
    })
    await afterAuthHook({
      path: "/sign-out",
      context: {},
    })
    await afterAuthHook({
      path: "/sign-out",
      headers,
      context: {
        session: { user: { id: "user-a" } },
        returned: new APIError("BAD_REQUEST", { message: "no" }),
      },
    })
    await afterAuthHook({
      path: "/sign-out",
      headers,
      context: { session: { user: { id: "user-a" } } },
    })
    await afterAuthHook({
      path: "/change-password",
      context: { session: { user: { id: "user-a" } } },
    })
    await afterAuthHook({
      path: "/two-factor/enable",
      context: { session: { user: { id: "user-a" } } },
    })
    await afterAuthHook({
      path: "/two-factor/disable",
      context: { session: { user: { id: "user-a" } } },
    })
    await afterAuthHook({
      path: "/other",
      context: { session: { user: { id: "user-a" } } },
    })

    const logs = await withUser(db, "user-a", (tx) => tx.select().from(auditLog))
    const actions = logs.map((row) => row.action).sort()
    expect(actions).toEqual(
      [
        "security.2fa.disable",
        "security.2fa.enable",
        "security.login",
        "security.login.failed",
        "security.logout",
        "security.password.change",
      ].sort(),
    )

    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const previous = dbHolder.db
    dbHolder.db = {
      transaction: async () => {
        throw new Error("audit boom")
      },
    }
    await afterAuthHook({
      path: "/two-factor/verify-otp",
      context: { newSession: { user: { id: "user-a", email: "ada@test.local" } } },
    })
    dbHolder.db = previous
    expect(error).toHaveBeenCalled()
    error.mockRestore()
    await closeTestDb(client)
  })

  it("records the login on the verified OTP, not on the 2FA redirect", async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, "user-b", "grace@test.local")
    const headers = new Headers({ "x-forwarded-for": "10.0.0.3", "user-agent": "hook" })

    // /sign-in/email answered with twoFactorRedirect: no session, nothing logged.
    await afterAuthHook({ path: "/sign-in/email", headers, context: { newSession: null } })
    // A failed OTP is not a login either.
    await afterAuthHook({
      path: "/two-factor/verify-otp",
      headers,
      context: {
        newSession: { user: { id: "user-b" } },
        returned: new APIError("UNAUTHORIZED", { message: "no" }),
      },
    })
    await afterAuthHook({ path: "/two-factor/verify-otp", headers, context: { newSession: null } })

    expect(await withUser(db, "user-b", (tx) => tx.select().from(auditLog))).toEqual([])
    expect(sendNewLoginAlert).not.toHaveBeenCalled()

    await afterAuthHook({
      path: "/two-factor/verify-otp",
      headers,
      context: {
        newSession: {
          user: { id: "user-b", email: "grace@test.local", name: "Grace", locale: "pt-BR" },
        },
      },
    })

    const logs = await withUser(db, "user-b", (tx) => tx.select().from(auditLog))
    expect(logs.map((row) => row.action)).toEqual(["security.login"])
    expect(sendNewLoginAlert).toHaveBeenCalledWith(
      { email: "grace@test.local", name: "Grace", locale: "pt-BR" },
      { headers },
    )
    await closeTestDb(client)
  })

  it("alerts without a name or locale when the row carries neither", async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, "user-c", "alan@test.local")

    await afterAuthHook({
      path: "/two-factor/verify-otp",
      context: { newSession: { user: { id: "user-c", email: "alan@test.local" } } },
    })

    const logs = await withUser(db, "user-c", (tx) => tx.select().from(auditLog))
    expect(logs.map((row) => row.action)).toEqual(["security.login"])
    expect(sendNewLoginAlert).toHaveBeenCalledWith(
      { email: "alan@test.local", name: null, locale: null },
      { headers: undefined },
    )
    await closeTestDb(client)
  })

  it("skips the alert when the verified session has no address", async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, "user-d", "no-mail@test.local")

    await afterAuthHook({
      path: "/two-factor/verify-otp",
      context: { newSession: { user: { id: "user-d" } } },
    })

    const logs = await withUser(db, "user-d", (tx) => tx.select().from(auditLog))
    expect(logs.map((row) => row.action)).toEqual(["security.login"])
    expect(sendNewLoginAlert).not.toHaveBeenCalled()
    await closeTestDb(client)
  })
})

describe("emailRecipient", () => {
  it("keeps only a usable address and narrows the optional fields", () => {
    expect(emailRecipient({ email: "ada@test.local", name: "Ada", locale: "pt-BR" })).toEqual({
      email: "ada@test.local",
      name: "Ada",
      locale: "pt-BR",
    })
    expect(emailRecipient({ email: "ada@test.local", name: 42, locale: 7 })).toEqual({
      email: "ada@test.local",
      name: null,
      locale: null,
    })
    expect(emailRecipient({ email: "" })).toBeNull()
    expect(emailRecipient({})).toBeNull()
  })
})

describe("auth mailers", () => {
  it("routes every Better Auth callback to its template", async () => {
    const target = { email: "ada@test.local", name: "Ada", locale: "pt-BR" }
    const recipient = { email: "ada@test.local", name: "Ada", locale: "pt-BR" }

    await sendVerificationEmailFor({ user: target, url: "https://app.test/verify?token=a" })
    await sendResetPasswordEmail({ user: target, url: "https://app.test/reset?token=b" })
    await sendTwoFactorOtp({ user: target, otp: "123456" })

    expect(sendAccountConfirmation).toHaveBeenCalledWith(
      recipient,
      "https://app.test/verify?token=a",
    )
    expect(sendPasswordReset).toHaveBeenCalledWith(recipient, "https://app.test/reset?token=b")
    expect(sendLoginOtp).toHaveBeenCalledWith(recipient, "123456")
  })

  it("stays silent when the callback carries no address", async () => {
    await sendVerificationEmailFor({ user: {}, url: "https://app.test/verify" })
    await sendResetPasswordEmail({ user: {}, url: "https://app.test/reset" })
    await sendTwoFactorOtp({ user: {}, otp: "123456" })

    expect(sendAccountConfirmation).not.toHaveBeenCalled()
    expect(sendPasswordReset).not.toHaveBeenCalled()
    expect(sendLoginOtp).not.toHaveBeenCalled()
  })
})

describe("enableTwoFactorOnCreate", () => {
  it("turns email 2FA on for every new account", async () => {
    await expect(enableTwoFactorOnCreate({ email: "ada@test.local" })).resolves.toEqual({
      data: { email: "ada@test.local", twoFactorEnabled: true },
    })
  })
})

describe("syntheticSignupUser", () => {
  it("keeps email 2FA on and the caller's extra fields", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z")
    const updatedAt = new Date("2026-01-02T00:00:00.000Z")
    expect(
      syntheticSignupUser({
        coreFields: {
          name: "Ada",
          email: "ada@test.local",
          emailVerified: false,
          image: null,
          createdAt,
          updatedAt,
        },
        additionalFields: { locale: "pt-BR" },
        id: "synthetic",
      }),
    ).toEqual({
      name: "Ada",
      email: "ada@test.local",
      emailVerified: false,
      image: null,
      createdAt,
      updatedAt,
      locale: "pt-BR",
      twoFactorEnabled: true,
      id: "synthetic",
    })
  })
})

describe("beforeAuthHook", () => {
  it("rejects signup names shorter than 2 characters", async () => {
    await expect(
      beforeAuthHook({ path: "/sign-in/email", body: { name: "A" }, context: {} }),
    ).resolves.toBeUndefined()
    const confirmed = {
      name: "Ada",
      email: "ada@test.local",
      password: "password1234",
      confirmPassword: "password1234",
    }
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: confirmed, context: {} }),
    ).resolves.toBeUndefined()
    expect(confirmed).not.toHaveProperty("confirmPassword")
    const padded = {
      name: "  Ad  ",
      password: "password1234",
      confirmPassword: "password1234",
    }
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: padded, context: {} }),
    ).resolves.toBeUndefined()
    expect(padded).not.toHaveProperty("confirmPassword")
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: { name: "A" }, context: {} }),
    ).rejects.toBeInstanceOf(APIError)
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: { name: "  " }, context: {} }),
    ).rejects.toMatchObject({
      status: "BAD_REQUEST",
    })
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: { name: 1 }, context: {} }),
    ).rejects.toBeInstanceOf(APIError)
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: "nope", context: {} }),
    ).rejects.toBeInstanceOf(APIError)
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: { email: "a@test.local" }, context: {} }),
    ).rejects.toBeInstanceOf(APIError)
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: null, context: {} }),
    ).rejects.toBeInstanceOf(APIError)
    await expect(
      beforeAuthHook({
        path: "/sign-up/email",
        body: { name: "Ada", email: "ada@test.local" },
        context: {},
      }),
    ).rejects.toMatchObject({
      status: "BAD_REQUEST",
      body: { code: "PASSWORDS_DO_NOT_MATCH", message: validation.passwordsMismatch },
    })
  })

  it("rejects a signup password that was not repeated", () => {
    expect(() =>
      assertSignupPasswordConfirmation({
        password: "password1234",
        confirmPassword: "password1235",
      }),
    ).toThrow(APIError)
    expect(() => assertSignupPasswordConfirmation({ password: "password1234" })).toThrow(APIError)
    expect(() =>
      assertSignupPasswordConfirmation({ password: 1, confirmPassword: "password1234" }),
    ).toThrow(APIError)
    expect(() =>
      assertSignupPasswordConfirmation({ password: "password1234", confirmPassword: null }),
    ).toThrow(APIError)
    const body = { password: "password1234", confirmPassword: "password1234", locale: "pt-BR" }
    expect(assertSignupPasswordConfirmation(body)).toBeUndefined()
    expect(body).toEqual({ password: "password1234", locale: "pt-BR" })
  })

  it("forces other sessions to end when the password changes", async () => {
    await expect(
      beforeAuthHook({ path: "/change-password", body: null, context: {} }),
    ).resolves.toBeUndefined()
    await expect(
      beforeAuthHook({ path: "/change-password", body: "nope", context: {} }),
    ).resolves.toBeUndefined()
    await expect(
      beforeAuthHook({
        path: "/change-password",
        body: {
          newPassword: "newpassword9",
          currentPassword: "password1234",
          revokeOtherSessions: false,
        },
        context: {},
      }),
    ).resolves.toEqual({
      context: {
        body: {
          newPassword: "newpassword9",
          currentPassword: "password1234",
          revokeOtherSessions: true,
        },
      },
    })
  })
})

describe("signup input", () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  it("rejects short names and passwords on email signup", async () => {
    const { db, client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()
    const signup = {
      email: "ok@test.local",
      password: "password1234",
      confirmPassword: "password1234",
      name: "Ada Lovelace",
    }

    await expect(
      auth.api.signUpEmail({
        body: { email: "short@test.local", password: "password1234", name: "A" },
      }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" })

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "pw@test.local",
          password: "1234567",
          confirmPassword: "1234567",
          name: "Ada Lovelace",
        },
      }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST", body: { code: "PASSWORD_TOO_SHORT" } })

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "long@test.local",
          password: "a".repeat(129),
          confirmPassword: "a".repeat(129),
          name: "Ada Lovelace",
        },
      }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST", body: { code: "PASSWORD_TOO_LONG" } })

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "mismatch@test.local",
          password: "password1234",
          confirmPassword: "different12",
          name: "Ada Lovelace",
        },
      }),
    ).rejects.toMatchObject({
      status: "BAD_REQUEST",
      body: { code: "PASSWORDS_DO_NOT_MATCH", message: validation.passwordsMismatch },
    })

    await expect(
      auth.api.signUpEmail({
        body: { email: "missing@test.local", password: "password1234", name: "Ada Lovelace" },
      }),
    ).rejects.toMatchObject({
      status: "BAD_REQUEST",
      body: { code: "PASSWORDS_DO_NOT_MATCH" },
    })

    const created = await auth.api.signUpEmail({ body: { ...signup }, asResponse: true })
    const duplicate = await auth.api.signUpEmail({ body: { ...signup }, asResponse: true })
    expect(created.status).toBe(200)
    expect(duplicate.status).toBe(200)

    const createdBody = (await created.json()) as {
      token: string | null
      user: Record<string, unknown>
    }
    const duplicateBody = (await duplicate.json()) as {
      token: string | null
      user: Record<string, unknown>
    }
    expect(createdBody.token).toBeNull()
    expect(createdBody.user).not.toHaveProperty("confirmPassword")
    expect(duplicateBody.token).toBeNull()
    expect(duplicateBody).not.toHaveProperty("code")
    expect(signupProfile(duplicateBody.user)).toEqual(signupProfile(createdBody.user))
    expect(duplicateBody.user.id).not.toBe(createdBody.user.id)

    const decoy = await auth.api.signUpEmail({
      body: { ...signup, email: "OK@test.local", name: "Grace Hopper" },
      asResponse: true,
    })
    expect(decoy.status).toBe(200)
    const decoyBody = (await decoy.json()) as { token: string | null; user: { name: string } }
    expect(decoyBody.token).toBeNull()
    expect(decoyBody.user.name).toBe("Grace Hopper")

    await expect(
      auth.api.signUpEmail({
        body: { email: "ok@test.local", password: "password1234", name: "A" },
      }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" })

    const rows = await db.select().from(userTable)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: createdBody.user.id,
      email: "ok@test.local",
      name: "Ada Lovelace",
    })
    resetAuth()
    await closeTestDb(client)
  })
})

function signupProfile(user: Record<string, unknown>) {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = user
  return rest
}

describe("auth options", () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  it("keeps a 30-day session, mandatory verification and email-only 2FA", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()

    expect(auth.options.session).toEqual({ expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 })
    expect(auth.options.emailAndPassword).toMatchObject({
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      customSyntheticUser: syntheticSignupUser,
    })
    expect(auth.options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      sendOnSignIn: true,
    })
    expect(auth.options.user?.additionalFields?.locale).toMatchObject({
      type: "string",
      defaultValue: "en-US",
      input: true,
    })

    const plugin = (auth.options.plugins ?? []).find((entry) => entry.id === "two-factor")
    const options = (plugin as { options?: Record<string, unknown> }).options
    expect(options?.totpOptions).toEqual({ disable: true })
    expect(options?.otpOptions).toMatchObject({
      period: 10,
      digits: 6,
      storeOTP: "hashed",
      allowedAttempts: 5,
    })

    resetAuth()
    await closeTestDb(client)
  })
})

describe("email OTP sign-in", () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  function cookieHeader(response: Response) {
    return new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((entry) => entry.split(";")[0])
        .join("; "),
    })
  }

  it("signs up unverified, then takes a confirmed account through the emailed code", async () => {
    const { db, client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()
    const credentials = { email: "ada@test.local", password: "password1234" }

    const signedUp = await auth.api.signUpEmail({
      body: {
        ...credentials,
        name: "Ada Lovelace",
        locale: "pt-BR",
        confirmPassword: credentials.password,
      },
    })
    expect(signedUp.token).toBeNull()

    const [created] = await db.select().from(userTable)
    expect(created).toMatchObject({ emailVerified: false, twoFactorEnabled: true, locale: "pt-BR" })

    const [confirmation] = vi.mocked(sendAccountConfirmation).mock.calls
    expect(confirmation[0]).toMatchObject({ email: "ada@test.local", locale: "pt-BR" })
    expect(confirmation[1]).toContain("/verify-email?token=")

    await expect(auth.api.signInEmail({ body: credentials })).rejects.toMatchObject({
      body: { code: "EMAIL_NOT_VERIFIED" },
    })

    const token = new URL(confirmation[1]).searchParams.get("token") ?? ""
    await auth.api.verifyEmail({ query: { token }, asResponse: true })
    const [verified] = await db.select().from(userTable)
    expect(verified.emailVerified).toBe(true)

    const challenge = await auth.api.signInEmail({ body: credentials, asResponse: true })
    expect(await challenge.clone().json()).toMatchObject({
      twoFactorRedirect: true,
      twoFactorMethods: ["otp"],
    })

    const headers = cookieHeader(challenge)
    await auth.api.sendTwoFactorOTP({ headers, body: {} })
    const [otpCall] = vi.mocked(sendLoginOtp).mock.calls
    expect(otpCall[0]).toMatchObject({ email: "ada@test.local", locale: "pt-BR" })
    expect(otpCall[1]).toMatch(/^\d{6}$/)

    await expect(
      auth.api.verifyTwoFactorOTP({ headers, body: { code: "000000" } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_CODE" } })
    expect(sendNewLoginAlert).not.toHaveBeenCalled()

    const session = await auth.api.verifyTwoFactorOTP({ headers, body: { code: otpCall[1] } })
    expect(session.token).toBeTruthy()

    expect(sendNewLoginAlert).toHaveBeenCalledOnce()
    expect(vi.mocked(sendNewLoginAlert).mock.calls[0][0]).toMatchObject({
      email: "ada@test.local",
      locale: "pt-BR",
    })
    // The blocked sign-in above is a failed attempt; only the OTP is a login.
    const logs = await withUser(db, created.id, (tx) => tx.select().from(auditLog))
    expect(logs.map((row) => row.action).sort()).toEqual([
      "security.login",
      "security.login.failed",
    ])

    resetAuth()
    await closeTestDb(client)
  })

  it("emails a reset link on request", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()

    await auth.api.signUpEmail({
      body: {
        email: "grace@test.local",
        password: "password1234",
        confirmPassword: "password1234",
        name: "Grace Hopper",
      },
    })
    await auth.api.requestPasswordReset({
      body: { email: "grace@test.local", redirectTo: "http://localhost:5173/reset-password" },
    })

    const [reset] = vi.mocked(sendPasswordReset).mock.calls
    expect(reset[0]).toMatchObject({ email: "grace@test.local", locale: "en-US" })
    expect(reset[1]).toContain("/reset-password/")

    resetAuth()
    await closeTestDb(client)
  })
})

describe("password session revocation", () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  function cookieHeader(response: Response) {
    return new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((entry) => entry.split(";")[0])
        .join("; "),
    })
  }

  async function verifyAccount(auth: AuthInstance) {
    const [confirmation] = vi.mocked(sendAccountConfirmation).mock.calls
    const token = new URL(confirmation[1]).searchParams.get("token") ?? ""
    await auth.api.verifyEmail({ query: { token }, asResponse: true })
  }

  async function openSession(auth: AuthInstance, email: string, password: string) {
    const challenge = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    })
    const pending = cookieHeader(challenge)
    await auth.api.sendTwoFactorOTP({ headers: pending, body: {} })
    const calls = vi.mocked(sendLoginOtp).mock.calls
    const verified = await auth.api.verifyTwoFactorOTP({
      headers: pending,
      body: { code: calls[calls.length - 1][1] },
      asResponse: true,
    })
    return cookieHeader(verified)
  }

  it("ends every session after a password reset", async () => {
    const { db, client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()
    const email = "ada@test.local"
    const password = "password1234"

    await auth.api.signUpEmail({
      body: { email, password, confirmPassword: password, name: "Ada Lovelace" },
    })
    await verifyAccount(auth)
    const first = await openSession(auth, email, password)
    const second = await openSession(auth, email, password)
    expect(await db.select().from(sessionTable)).toHaveLength(2)

    await auth.api.requestPasswordReset({
      body: { email, redirectTo: "http://localhost:5173/reset-password" },
    })
    const resetUrl = vi.mocked(sendPasswordReset).mock.calls.at(-1)?.[1] ?? ""
    const token = new URL(resetUrl).pathname.split("/").pop() ?? ""
    await expect(
      auth.api.resetPassword({ body: { newPassword: "newpassword9", token } }),
    ).resolves.toEqual({ status: true })

    expect(await auth.api.getSession({ headers: first })).toBeNull()
    expect(await auth.api.getSession({ headers: second })).toBeNull()
    expect(await db.select().from(sessionTable)).toHaveLength(0)

    const challenge = await auth.api.signInEmail({
      body: { email, password: "newpassword9" },
      asResponse: true,
    })
    expect(await challenge.json()).toMatchObject({ twoFactorRedirect: true })
    resetAuth()
    await closeTestDb(client)
  })

  it("ends other sessions when the password changes even if the client opts out", async () => {
    const { db, client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()
    const email = "grace@test.local"
    const password = "password1234"

    await auth.api.signUpEmail({
      body: { email, password, confirmPassword: password, name: "Grace Hopper" },
    })
    await verifyAccount(auth)
    const current = await openSession(auth, email, password)
    const other = await openSession(auth, email, password)

    const changed = await auth.api.changePassword({
      headers: current,
      body: {
        currentPassword: password,
        newPassword: "newpassword9",
        revokeOtherSessions: false,
      },
      asResponse: true,
    })
    expect(changed.status).toBe(200)
    const next = cookieHeader(changed)
    expect(await auth.api.getSession({ headers: current })).toBeNull()
    expect(await auth.api.getSession({ headers: other })).toBeNull()
    await expect(auth.api.getSession({ headers: next })).resolves.toMatchObject({
      user: { email },
    })
    expect(await db.select().from(sessionTable)).toHaveLength(1)
    resetAuth()
    await closeTestDb(client)
  })
})
