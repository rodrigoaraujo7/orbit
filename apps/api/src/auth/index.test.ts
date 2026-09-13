import { readFile } from "node:fs/promises"
import { APIError } from "better-auth/api"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { auditLog, user as userTable } from "../db/schema/index.ts"
import {
  afterAuthHook,
  beforeAuthHook,
  createAuth,
  emailRecipient,
  enableTwoFactorOnCreate,
  getAuth,
  resetAuth,
  sendResetPasswordEmail,
  sendTwoFactorOtp,
  sendVerificationEmailFor,
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

describe("beforeAuthHook", () => {
  it("rejects signup names shorter than 2 characters", async () => {
    await expect(
      beforeAuthHook({ path: "/sign-in/email", body: { name: "A" }, context: {} }),
    ).resolves.toBeUndefined()
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: { name: "Ada" }, context: {} }),
    ).resolves.toBeUndefined()
    await expect(
      beforeAuthHook({ path: "/sign-up/email", body: { name: "  Ad  " }, context: {} }),
    ).resolves.toBeUndefined()
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
  })
})

describe("signup input", () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  it("rejects short names and passwords on email signup", async () => {
    const { client } = await openTestDb()
    vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-better-auth-secret")
    const auth = createAuth()

    await expect(
      auth.api.signUpEmail({
        body: { email: "short@test.local", password: "password1234", name: "A" },
      }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" })

    await expect(
      auth.api.signUpEmail({
        body: { email: "pw@test.local", password: "1234567", name: "Ada Lovelace" },
      }),
    ).rejects.toBeInstanceOf(APIError)

    const signedUp = await auth.api.signUpEmail({
      body: { email: "ok@test.local", password: "password1234", name: "Ada Lovelace" },
    })
    expect(signedUp.user.name).toBe("Ada Lovelace")

    await expect(
      auth.api.signUpEmail({
        body: { email: "ok@test.local", password: "password1234", name: "Ada Lovelace" },
      }),
    ).rejects.toMatchObject({ body: { code: "USER_ALREADY_EXISTS" } })
    resetAuth()
    await closeTestDb(client)
  })
})

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
      body: { ...credentials, name: "Ada Lovelace", locale: "pt-BR" },
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
      body: { email: "grace@test.local", password: "password1234", name: "Grace Hopper" },
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
