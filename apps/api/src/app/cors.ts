import { DASH_ORIGIN, isDashPath, resolveDashApiKey } from "../auth/dash/index.ts"
import { trustedWebOrigins } from "../web-origin/index.ts"

/**
 * The hosted Better Auth dashboard is a third party, so it may only send credentials to the
 * dashboard routes, and only while those routes are actually mounted.
 */
export function resolveCorsOrigin(origin: string, path: string): string | null {
  if (trustedWebOrigins.includes(origin)) return origin
  if (origin === DASH_ORIGIN && isDashPath(path) && resolveDashApiKey()) return origin
  return null
}
