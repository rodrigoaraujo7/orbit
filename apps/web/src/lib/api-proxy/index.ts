export const PRODUCTION_API_ORIGIN = "https://api-production-b70f.up.railway.app"

/** Preview deploys set API_PROXY_TARGET. Production leaves it empty. */
export function resolveApiProxyOrigin(value: string | undefined | null) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return PRODUCTION_API_ORIGIN
  return new URL(trimmed).origin
}

export function apiProxyUrl(requestUrl: string, apiOrigin: string) {
  const incoming = new URL(requestUrl)
  const target = new URL(apiOrigin)
  target.pathname = incoming.pathname
  target.search = incoming.search
  return target.toString()
}
