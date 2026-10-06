import { optionalEnv } from "../../env/index.ts"
import { trustedWebOrigins } from "../../web-origin/index.ts"

export const INVALID_AUTH_TRUSTED_ORIGIN = "AUTH_TRUSTED_ORIGIN must be a single origin URL"

/**
 * Branch and deployment previews for this Vercel project. The `*` is one
 * host label sequence, and the team slug stays fixed, so other vercel.app
 * sites are not trusted.
 */
export const VERCEL_PREVIEW_ORIGIN = "https://orbit-web-*-rodrigo-araujos-projects.vercel.app"

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
  dashOrigin?: string,
) {
  const origins = [...trustedWebOrigins]
  if (dashOrigin) origins.push(dashOrigin)
  const tunnel = resolveAuthTrustedOrigin(extra)
  if (tunnel && !origins.includes(tunnel)) {
    origins.push(tunnel)
  }
  if (!origins.includes(VERCEL_PREVIEW_ORIGIN)) origins.push(VERCEL_PREVIEW_ORIGIN)
  return origins
}
