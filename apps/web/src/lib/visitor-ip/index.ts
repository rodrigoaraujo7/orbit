/** Survives Railway, which replaces `x-forwarded-for` and `x-real-ip`. */
export const VISITOR_IP_HEADER = "x-vercel-forwarded-for"

/**
 * Copy the visitor Vercel already resolved (`x-real-ip`) onto
 * `x-vercel-forwarded-for` before the rewrite leaves the platform.
 * A client-supplied value of that header is replaced.
 */
export function forwardedVisitorHeaders(incoming: Headers): Headers {
  const headers = new Headers(incoming)
  const visitor = headers.get("x-real-ip")?.trim() ?? ""
  if (visitor) headers.set(VISITOR_IP_HEADER, visitor)
  return headers
}
