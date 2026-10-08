import { and, eq, like } from "drizzle-orm"
import { getDb } from "../../db/client/index.ts"
import { verification } from "../../db/schema/index.ts"

/** Better Auth names the cookie `better-auth.trust_device` (plus an optional `__Secure-` / `__Host-` prefix). */
const TRUST_DEVICE_COOKIE_SUFFIX = ".trust_device"

/** Rows that let a later password sign-in skip email OTP. The value is the user id. */
const TRUST_DEVICE_IDENTIFIER_PREFIX = "trust-device-"

const TRUST_DEVICE_VERIFY_PATHS = new Set([
  "/two-factor/verify-otp",
  "/two-factor/verify-backup-code",
  "/two-factor/verify-totp",
])

export const TRUST_DEVICE_NOT_ALLOWED = {
  message: "Device trust is not allowed",
  code: "TRUST_DEVICE_NOT_ALLOWED",
} as const

type SignedCookie = string | false | null | undefined

type HookSession = { user: { id: string } } | null

export type SessionCookieReader = {
  getSignedCookie?: (name: string, secret: string) => Promise<SignedCookie>
  context: {
    session?: HookSession
    newSession?: HookSession
    secret?: string
    authCookies?: { sessionToken: { name: string } }
    internalAdapter?: {
      findSession: (token: string) => Promise<HookSession>
    }
  }
}

export function isTrustDeviceVerifyPath(path: string) {
  return TRUST_DEVICE_VERIFY_PATHS.has(path)
}

export function trustDeviceRequested(body: unknown) {
  if (typeof body !== "object" || body === null) return false
  if (!("trustDevice" in body)) return false
  return body.trustDevice === true
}

function cookiePairName(part: string) {
  const separator = part.indexOf("=")
  const name = separator === -1 ? part : part.slice(0, separator)
  return name.trim()
}

function isTrustDeviceCookieName(name: string) {
  return name === "trust_device" || name.endsWith(TRUST_DEVICE_COOKIE_SUFFIX)
}

/**
 * Drop every trust-device cookie. Returning the same `Headers` object means
 * nothing changed, so the caller can skip rewriting the request.
 */
export function stripTrustDeviceCookie(headers: Headers) {
  const cookie = headers.get("cookie")
  if (!cookie) return headers
  const parts = cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const hasTrustDevice = parts.some((part) => isTrustDeviceCookieName(cookiePairName(part)))
  if (!hasTrustDevice) return headers
  const kept = parts.filter((part) => !isTrustDeviceCookieName(cookiePairName(part)))
  const next = new Headers(headers)
  next.set("cookie", kept.join("; "))
  return next
}

export async function resolveSessionUserId(ctx: SessionCookieReader) {
  if (ctx.context.session) return ctx.context.session.user.id
  if (ctx.context.newSession) return ctx.context.newSession.user.id
  const readCookie = ctx.getSignedCookie
  const secret = ctx.context.secret
  const cookieName = ctx.context.authCookies?.sessionToken.name
  if (!readCookie || !secret || !cookieName) return null
  const token = await readCookie(cookieName, secret)
  if (typeof token !== "string" || token.length === 0) return null
  const found = await ctx.context.internalAdapter?.findSession(token)
  if (!found) return null
  return found.user.id
}

function tokenFrom(source: unknown) {
  if (typeof source !== "object" || source === null) return null
  if (!("token" in source)) return null
  const token = source.token
  if (typeof token !== "string" || token.length === 0) return null
  return token
}

/** User id carried by a still-valid password reset token, when there is one. */
export async function passwordResetUserId(body: unknown, query: unknown) {
  const token = tokenFrom(body) ?? tokenFrom(query)
  if (!token) return null
  const [row] = await getDb()
    .select({ value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, `reset-password:${token}`))
    .limit(1)
  if (!row || row.expiresAt.getTime() <= Date.now()) return null
  return row.value
}

export async function revokeTrustDevices(userId: string | null) {
  if (!userId) return
  await getDb()
    .delete(verification)
    .where(
      and(
        eq(verification.value, userId),
        like(verification.identifier, `${TRUST_DEVICE_IDENTIFIER_PREFIX}%`),
      ),
    )
}
