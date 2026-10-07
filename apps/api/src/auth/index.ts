import { dash } from "@better-auth/infra"
import { betterAuth, type BetterAuthPlugin } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api"
import { twoFactor } from "better-auth/plugins"
import { eq } from "drizzle-orm"
import { recordAudit } from "../audit/record/index.ts"
import { getDb } from "../db/client/index.ts"
import { schema, user } from "../db/schema/index.ts"
import { withUser } from "../db/with-user/index.ts"
import { DEFAULT_EMAIL_LOCALE, OTP_PERIOD_MINUTES } from "../email/config/index.ts"
import {
  sendAccountConfirmation,
  sendLoginOtp,
  sendNewLoginAlert,
  sendPasswordReset,
  type EmailRecipient,
} from "../email/send/index.ts"
import { validation } from "../input/messages.ts"
import { originUsesHttps, resolveAuthBaseUrl } from "../web-origin/index.ts"
import { DASH_ORIGIN, resolveDashApiKey } from "./dash/index.ts"
import { resolveBetterAuthSecret } from "./secret/index.ts"
import { resolveTrustedOrigins } from "./trusted-origins/index.ts"

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 30
const SESSION_UPDATE_AGE = 60 * 60 * 24

async function logSecurity(userId: string, action: string, headers: Headers | null | undefined) {
  try {
    await withUser(getDb(), userId, (tx) =>
      recordAudit(
        tx,
        {
          userId,
          ip: headers?.get("x-forwarded-for") ?? null,
          userAgent: headers?.get("user-agent") ?? null,
        },
        { module: "security", action },
      ),
    )
  } catch (error) {
    console.error("failed to record security audit", error)
  }
}

async function userIdByEmail(email: string) {
  const [row] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
  return row?.id
}

/**
 * `locale` is an additional field, so it rides along on the row Better Auth
 * hands the mailers but is absent from its `User` type.
 */
export function emailRecipient(candidate: {
  email?: unknown
  name?: unknown
  locale?: unknown
}): EmailRecipient | null {
  if (typeof candidate.email !== "string" || !candidate.email) return null
  return {
    email: candidate.email,
    name: typeof candidate.name === "string" ? candidate.name : null,
    locale: typeof candidate.locale === "string" ? candidate.locale : null,
  }
}

type MailedUser = { email?: unknown; name?: unknown; locale?: unknown }

export async function sendVerificationEmailFor({
  user: target,
  url,
}: {
  user: MailedUser
  url: string
}) {
  const recipient = emailRecipient(target)
  if (recipient) await sendAccountConfirmation(recipient, url)
}

export async function sendResetPasswordEmail({
  user: target,
  url,
}: {
  user: MailedUser
  url: string
}) {
  const recipient = emailRecipient(target)
  if (recipient) await sendPasswordReset(recipient, url)
}

export async function sendTwoFactorOtp({ user: target, otp }: { user: MailedUser; otp: string }) {
  const recipient = emailRecipient(target)
  if (recipient) await sendLoginOtp(recipient, otp)
}

/** Email OTP is the only second factor, so it is on from the first request. */
export async function enableTwoFactorOnCreate<T extends Record<string, unknown>>(created: T) {
  return { data: { ...created, twoFactorEnabled: true } }
}

/**
 * A duplicate signup must look like a new one. Real accounts are created with
 * email 2FA already on, so the stand-in user carries the same flag.
 */
export function syntheticSignupUser({
  coreFields,
  additionalFields,
  id,
}: {
  coreFields: {
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
  }
  additionalFields: Record<string, unknown>
  id: string
}) {
  return {
    ...coreFields,
    ...additionalFields,
    twoFactorEnabled: true,
    id,
  }
}

type HookUser = { id: string; email?: unknown; name?: unknown; locale?: unknown }

type AuthHookCtx = {
  path: string
  headers?: Headers | null
  request?: { headers?: Headers } | null
  body?: unknown
  context: {
    newSession?: { user: HookUser } | null
    session?: { user: HookUser } | null
    returned?: unknown
  }
}

export async function beforeAuthHook(ctx: AuthHookCtx) {
  if (ctx.path === "/change-password") {
    // The client cannot opt out of ending the other sessions.
    if (!ctx.body || typeof ctx.body !== "object") return
    return {
      context: {
        body: {
          ...(ctx.body as Record<string, unknown>),
          revokeOtherSessions: true,
        },
      },
    }
  }

  if (ctx.path !== "/sign-up/email") return
  const name =
    ctx.body && typeof ctx.body === "object" && "name" in ctx.body
      ? (ctx.body as { name?: unknown }).name
      : undefined
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new APIError("BAD_REQUEST", { message: validation.minChars })
  }
  // Confirmation is not a user column. Drop it after the check so it cannot be stored.
  assertSignupPasswordConfirmation(ctx.body as Record<string, unknown>)
}

/**
 * Signup must repeat the password. Length limits stay on Better Auth
 * (`minPasswordLength` / `maxPasswordLength`); this only checks the pair.
 */
export function assertSignupPasswordConfirmation(body: Record<string, unknown>) {
  const password = body.password
  const confirmPassword = body.confirmPassword
  if (
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    password !== confirmPassword
  ) {
    throw new APIError("BAD_REQUEST", {
      message: validation.passwordsMismatch,
      code: "PASSWORDS_DO_NOT_MATCH",
    })
  }
  delete body.confirmPassword
}

/** A session now exists: record the login and tell the account holder about it. */
async function recordSignIn(signedIn: HookUser, headers: Headers | null | undefined) {
  await logSecurity(signedIn.id, "security.login", headers)
  const recipient = emailRecipient(signedIn)
  if (recipient) await sendNewLoginAlert(recipient, { headers })
}

export async function afterAuthHook(ctx: AuthHookCtx) {
  const headers = ctx.headers ?? ctx.request?.headers
  const sessionUserId = ctx.context.newSession?.user.id ?? ctx.context.session?.user.id ?? null
  const failed = isAPIError(ctx.context.returned) || ctx.context.returned instanceof APIError

  /**
   * Every account has email 2FA, so a completed login is the verified OTP, not
   * `/sign-in/email`. The credential handler does create a session, but the 2FA
   * plugin deletes it and answers `twoFactorRedirect` — and its after-hook runs
   * after this one, so the session is still visible here and means nothing.
   */
  if (ctx.path === "/two-factor/verify-otp") {
    if (ctx.context.newSession && !failed) await recordSignIn(ctx.context.newSession.user, headers)
    return
  }

  if (ctx.path === "/sign-in/email") {
    if (failed) {
      const email =
        ctx.body && typeof ctx.body === "object" && "email" in ctx.body
          ? String((ctx.body as { email?: string }).email ?? "")
          : ""
      if (!email) return
      const id = await userIdByEmail(email)
      if (id) await logSecurity(id, "security.login.failed", headers)
    }
    return
  }

  if (!sessionUserId || failed) return

  if (ctx.path === "/sign-out") {
    await logSecurity(sessionUserId, "security.logout", headers)
  } else if (ctx.path === "/change-password") {
    await logSecurity(sessionUserId, "security.password.change", headers)
  } else if (ctx.path === "/two-factor/enable") {
    await logSecurity(sessionUserId, "security.2fa.enable", headers)
  } else if (ctx.path === "/two-factor/disable") {
    await logSecurity(sessionUserId, "security.2fa.disable", headers)
  }
}

export function createAuth() {
  const secret = resolveBetterAuthSecret()
  const baseURL = resolveAuthBaseUrl()
  const dashApiKey = resolveDashApiKey()
  const dashPlugins: BetterAuthPlugin[] = dashApiKey ? [dash({ apiKey: dashApiKey })] : []

  return betterAuth({
    baseURL,
    secret,
    trustedOrigins: resolveTrustedOrigins(undefined, dashApiKey ? DASH_ORIGIN : undefined),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    session: { expiresIn: SESSION_EXPIRES_IN, updateAge: SESSION_UPDATE_AGE },
    user: {
      additionalFields: {
        locale: {
          type: "string",
          defaultValue: DEFAULT_EMAIL_LOCALE,
          input: true,
          required: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      customSyntheticUser: syntheticSignupUser,
      sendResetPassword: sendResetPasswordEmail,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: sendVerificationEmailFor,
    },
    databaseHooks: { user: { create: { before: enableTwoFactorOnCreate } } },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: originUsesHttps(baseURL),
      },
    },
    plugins: [
      twoFactor({
        issuer: "Orbit",
        totpOptions: { disable: true },
        otpOptions: {
          period: OTP_PERIOD_MINUTES,
          digits: 6,
          storeOTP: "hashed",
          allowedAttempts: 5,
          sendOTP: sendTwoFactorOtp,
        },
      }),
      ...dashPlugins,
    ],
    hooks: {
      before: createAuthMiddleware(beforeAuthHook),
      after: createAuthMiddleware(afterAuthHook),
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

let singleton: Auth | undefined

export function getAuth() {
  singleton ??= createAuth()
  return singleton
}

export function resetAuth() {
  singleton = undefined
}
