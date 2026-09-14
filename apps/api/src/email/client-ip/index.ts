/**
 * The client address behind a proxy. `x-forwarded-for` is a chain — the first
 * entry is the original client, the rest are the hops that added themselves.
 */
export function clientIp(headers: Headers | null | undefined) {
  const forwarded = headers?.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  }
  const real = headers?.get("x-real-ip")?.trim()
  return real ? real : null
}
