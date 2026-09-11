import { resolveBetterAuthApiKey } from "../api-key/index.ts"

export const DASH_ORIGIN = "https://dash.better-auth.com"
export const DASH_PATH_PREFIX = "/api/auth/dash"

/**
 * `/dash/*` is admin over every tenant (user management, impersonation, password reset, 2FA
 * backup codes) and this product has no RBAC, so the Infrastructure API key is the only gate.
 * A short or low-entropy key counts as no key: the plugin stays unmounted.
 */
const minKeyLength = 32
const minKeyUniqueChars = 12

export type DashKeyStatus = "missing" | "weak" | "ok"

export function dashKeyStatus(value?: string | null): DashKeyStatus {
  const key = resolveBetterAuthApiKey(value)
  if (!key) return "missing"
  if (key.length < minKeyLength) return "weak"
  if (/\s/.test(key)) return "weak"
  if (new Set(key).size < minKeyUniqueChars) return "weak"
  return "ok"
}

/** The key when it is strong enough to mount the dashboard, otherwise `undefined`. */
export function resolveDashApiKey(value?: string | null) {
  const key = resolveBetterAuthApiKey(value)
  return key && dashKeyStatus(key) === "ok" ? key : undefined
}

export function isDashPath(path: string) {
  return path === DASH_PATH_PREFIX || path.startsWith(`${DASH_PATH_PREFIX}/`)
}
