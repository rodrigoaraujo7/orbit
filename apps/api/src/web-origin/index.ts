import { optionalEnv } from "../env/index.ts"

const loopbackHost = "localhost"
const DEFAULT_WEB_ORIGIN = `http://${loopbackHost}:5173`

/** localhost and 127.0.0.1 are different Origins; browsers treat them separately. */
export function webOriginAliases(origin: string): string[] {
  const unique = new Set<string>()
  const add = (value: string) => {
    const trimmed = value.trim()
    if (trimmed) unique.add(trimmed)
  }
  add(origin)
  try {
    const url = new URL(origin)
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1"
      add(url.origin)
    } else if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost"
      add(url.origin)
    }
  } catch {
    // keep the raw string only
  }
  return [...unique]
}

export function resolveWebOrigin(value: string | undefined | null = optionalEnv("WEB_ORIGIN")) {
  return value ?? DEFAULT_WEB_ORIGIN
}

export const webOrigin = resolveWebOrigin()
export const trustedWebOrigins = webOriginAliases(webOrigin)

export function resolveAuthBaseUrl(
  value: string | undefined | null = optionalEnv("BETTER_AUTH_URL"),
) {
  return value ?? webOrigin
}
