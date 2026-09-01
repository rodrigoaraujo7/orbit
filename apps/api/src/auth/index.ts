import { dash } from "@better-auth/infra"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api"
import { twoFactor } from "better-auth/plugins"
import { eq } from "drizzle-orm"
import { recordAudit } from "../audit/record/index.ts"
import { getDb } from "../db/client/index.ts"
import { schema, user } from "../db/schema/index.ts"
import { withUser } from "../db/with-user/index.ts"
import { env, optionalEnv } from "../env/index.ts"
import { validation } from "../input/messages.ts"
import { trustedWebOrigins, webOrigin } from "../web-origin/index.ts"

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

type AuthHookCtx = {
  path: string
  headers?: Headers | null
  request?: { headers?: Headers } | null
  body?: unknown
  context: {
    newSession?: { user: { id: string } } | null
    session?: { user: { id: string } } | null
    returned?: unknown
  }
}

export async function beforeAuthHook(ctx: AuthHookCtx) {
  if (ctx.path !== "/sign-up/email") return
  const name =
    ctx.body && typeof ctx.body === "object" && "name" in ctx.body
      ? (ctx.body as { name?: unknown }).name
      : undefined
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new APIError("BAD_REQUEST", { message: validation.minChars })
  }
}

export async function afterAuthHook(ctx: AuthHookCtx) {
  const headers = ctx.headers ?? ctx.request?.headers
  const sessionUserId = ctx.context.newSession?.user.id ?? ctx.context.session?.user.id ?? null
  const failed = isAPIError(ctx.context.returned) || ctx.context.returned instanceof APIError

  if (ctx.path === "/sign-in/email") {
    if (ctx.context.newSession) {
      await logSecurity(ctx.context.newSession.user.id, "security.login", headers)
      return
    }
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
  const secret =
    optionalEnv("BETTER_AUTH_SECRET") ??
    (process.env.NODE_ENV === "production"
      ? env("BETTER_AUTH_SECRET")
      : "dev-only-better-auth-secret-not-for-production")

  return betterAuth({
    baseURL: optionalEnv("BETTER_AUTH_URL") ?? webOrigin,
    secret,
    trustedOrigins: [...trustedWebOrigins, "https://dash.better-auth.com", "https://*.ngrok-free.app"],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    plugins: [twoFactor({ issuer: "Projects Manager" }), dash()],
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
