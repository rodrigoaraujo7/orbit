import { optionalEnv } from "../../env/index.ts"
import { trustedWebOrigins } from "../../web-origin/index.ts"

export const BETTER_AUTH_DASHBOARD_ORIGIN = "https://dash.better-auth.com"
export const INVALID_AUTH_TRUSTED_ORIGIN = "AUTH_TRUSTED_ORIGIN must be a single origin URL"

export function resolveAuthTrustedOrigin(
  value: string | undefined | null = optionalEnv("AUTH_TRUSTED_ORIGIN"),
) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return undefined
  if (trimmed.includes("*") || trimmed.includes(",")) {
    throw new Error(INVALID_AUTH_TRUSTED_ORIGIN)
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(INVALID_AUTH_TRUSTED_ORIGIN)
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) {
    throw new Error(INVALID_AUTH_TRUSTED_ORIGIN)
  }
  return url.origin
}

export function resolveTrustedOrigins(
  extra: string | undefined | null = optionalEnv("AUTH_TRUSTED_ORIGIN"),
) {
  const origins = [...trustedWebOrigins, BETTER_AUTH_DASHBOARD_ORIGIN]
  const tunnel = resolveAuthTrustedOrigin(extra)
  if (tunnel && !origins.includes(tunnel)) {
    origins.push(tunnel)
  }
  return origins
}
