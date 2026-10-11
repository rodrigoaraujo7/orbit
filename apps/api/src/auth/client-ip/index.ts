import { BlockList, isIP } from "node:net"
import { optionalEnv } from "../../env/index.ts"

export const INVALID_AUTH_TRUSTED_PROXIES =
  "AUTH_TRUSTED_PROXIES must be a comma-separated list of IP addresses or CIDR ranges"

/** Header Vercel sets to the visitor. Railway's edge does not overwrite it. */
export const VISITOR_IP_HEADER = "x-vercel-forwarded-for"

/**
 * Addresses Railway can record as the peer of the Vercel rewrite.
 * AS922 prefixes announced to RIPE RIS on 2026-10-11, plus Vercel's
 * long-standing anycast ranges. `AUTH_TRUSTED_PROXIES` replaces the list.
 */
export const VERCEL_PROXY_CIDRS = [
  "64.29.17.0/24",
  "64.239.109.0/24",
  "64.239.123.0/24",
  "66.33.60.0/24",
  "76.76.21.0/24",
  "143.13.0.0/20",
  "143.13.64.0/21",
  "143.13.72.0/24",
  "143.13.80.0/24",
  "143.13.84.0/23",
  "143.13.88.0/24",
  "143.13.92.0/24",
  "143.13.96.0/24",
  "143.13.100.0/24",
  "143.13.104.0/24",
  "143.13.108.0/24",
  "143.13.112.0/24",
  "143.13.116.0/24",
  "143.13.120.0/24",
  "143.13.124.0/24",
  "143.13.128.0/24",
  "143.13.132.0/24",
  "143.13.136.0/24",
  "143.13.140.0/24",
  "155.121.192.0/24",
  "155.121.208.0/24",
  "155.121.216.0/24",
  "155.121.220.0/24",
  "155.121.224.0/24",
  "155.121.225.0/24",
  "155.121.226.0/24",
  "155.121.227.0/24",
  "155.121.228.0/24",
  "155.121.230.0/24",
  "155.121.231.0/24",
  "155.121.232.0/24",
  "155.121.234.0/24",
  "155.121.235.0/24",
  "155.121.236.0/24",
  "155.121.240.0/24",
  "155.121.242.0/24",
  "155.121.244.0/24",
  "155.121.248.0/24",
  "198.169.1.0/24",
  "198.169.2.0/24",
  "216.150.1.0/24",
  "216.150.16.0/24",
  "216.198.79.0/24",
  "216.230.84.0/24",
  "216.230.86.0/24",
  "2607:db00:8000::/44",
  "2607:db00:8040::/45",
  "2607:db00:8048::/48",
  "2607:db00:8050::/48",
  "2607:db00:8054::/47",
  "2607:db00:8058::/48",
  "2607:db00:805c::/48",
  "2607:db00:8060::/48",
  "2607:db00:8064::/48",
  "2607:db00:8068::/48",
  "2607:db00:806c::/48",
  "2607:db00:8070::/48",
  "2607:db00:8074::/48",
  "2607:db00:8078::/48",
  "2607:db00:807c::/48",
  "2607:db00:8080::/48",
  "2607:db00:8084::/48",
  "2607:db00:8088::/48",
  "2607:db00:808c::/48",
] as const

type CompiledProxies = { list: BlockList; trustChain: boolean }

function normalizeAddress(token: string): string {
  const trimmed = token.trim()
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed)
  if (mapped?.[1] && isIP(mapped[1]) === 4) return mapped[1]
  return trimmed
}

function headerAddresses(value: string | null): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((part) => normalizeAddress(part))
    .filter((part) => part.length > 0)
}

function isAddress(ip: string): boolean {
  return isIP(ip) !== 0
}

function addProxy(list: BlockList, entry: string): boolean {
  const slash = entry.lastIndexOf("/")
  const addr = slash === -1 ? entry : entry.slice(0, slash)
  const version = isIP(addr)
  if (version === 0) return false
  const family = version === 6 ? "ipv6" : "ipv4"
  const maxBits = family === "ipv6" ? 128 : 32
  let prefix = maxBits
  if (slash !== -1) {
    const raw = entry.slice(slash + 1)
    if (!/^\d+$/.test(raw)) return false
    prefix = Number(raw)
    if (prefix > maxBits) return false
  }
  list.addSubnet(addr, prefix, family)
  return true
}

function compileProxies(entries: readonly string[]): CompiledProxies {
  const list = new BlockList()
  let trustChain = false
  for (const entry of entries) {
    if (addProxy(list, entry)) trustChain = true
  }
  return { list, trustChain }
}

function isTrustedProxy(ip: string, list: BlockList): boolean {
  return list.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4")
}

/**
 * Rightmost untrusted hop. With no trusted proxy, a multi-value chain is
 * rejected: the left side is caller-controlled and the right side is not
 * known to be our edge.
 */
function clientFromChain(ips: string[], compiled: CompiledProxies): string | null {
  if (!compiled.trustChain) {
    const only = ips.length === 1 ? ips[0] : undefined
    if (!only || !isAddress(only)) return null
    return only
  }
  for (const ip of [...ips].reverse()) {
    if (!isAddress(ip)) return null
    if (isTrustedProxy(ip, compiled.list)) continue
    return ip
  }
  return null
}

function singleAddress(value: string | null): string | null {
  const addresses = headerAddresses(value)
  const only = addresses.length === 1 ? addresses[0] : undefined
  if (!only || !isAddress(only)) return null
  return only
}

export function resolveTrustedProxies(
  value: string | undefined | null = optionalEnv("AUTH_TRUSTED_PROXIES"),
): string[] {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return [...VERCEL_PROXY_CIDRS]
  const entries = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  if (entries.length === 0) return [...VERCEL_PROXY_CIDRS]
  const list = new BlockList()
  for (const entry of entries) {
    if (!addProxy(list, entry)) throw new Error(INVALID_AUTH_TRUSTED_PROXIES)
  }
  return entries
}

/**
 * Visitor address for an auth rate-limit key.
 *
 * Railway's public edge replaces `x-forwarded-for` and `x-real-ip` with the
 * connecting peer, so after the Vercel rewrite that peer is Vercel, not the
 * browser. The visitor is taken from `x-vercel-forwarded-for` only when that
 * peer is a trusted proxy. A direct caller is keyed by the peer Railway
 * recorded; a header they attach does not choose the bucket.
 */
export function resolveAuthClientIp(
  headers: Headers,
  proxies: readonly string[] = resolveTrustedProxies(),
): string | null {
  const compiled = compileProxies(proxies)
  const peer = singleAddress(headers.get("x-real-ip"))
  const forwarded = headerAddresses(headers.get("x-forwarded-for"))
  const rightmost = forwarded[forwarded.length - 1]
  // A chain is only ours when Railway's peer is its last hop. Without that
  // peer, a caller could append a Vercel address and pick the bucket.
  const peerAligned = Boolean(peer && rightmost === peer)
  const fromChain = clientFromChain(
    peerAligned || !peer ? forwarded : [],
    peer ? compiled : { list: compiled.list, trustChain: false },
  )
  if (fromChain) return fromChain

  if (peer && isTrustedProxy(peer, compiled.list)) {
    const visitor = clientFromChain(headerAddresses(headers.get(VISITOR_IP_HEADER)), compiled)
    if (visitor) return visitor
  }

  if (peer && !isTrustedProxy(peer, compiled.list)) return peer
  return null
}

/** One client address in `x-forwarded-for`, which is the header Better Auth reads. */
export function authRequestWithClientIp(
  request: Request,
  proxies: readonly string[] = resolveTrustedProxies(),
): Request {
  const headers = new Headers(request.headers)
  const client = resolveAuthClientIp(headers, proxies)
  if (client) headers.set("x-forwarded-for", client)
  else headers.delete("x-forwarded-for")
  return new Request(request, { headers })
}
