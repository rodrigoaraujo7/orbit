const buckets = new Map<string, number[]>()

/** Sliding window. Returns false when the user is over the limit. */
export function allowAttempt(key: string, limit: number, windowMs: number, now = Date.now()) {
  const start = now - windowMs
  const next = (buckets.get(key) ?? []).filter((t) => t > start)
  if (next.length >= limit) {
    buckets.set(key, next)
    return false
  }
  next.push(now)
  buckets.set(key, next)
  return true
}

export function resetAttempts() {
  buckets.clear()
}
