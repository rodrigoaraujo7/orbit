import { afterEach, describe, expect, it, vi } from "vitest"
import {
  authRequestWithClientIp,
  INVALID_AUTH_TRUSTED_PROXIES,
  resolveAuthClientIp,
  resolveTrustedProxies,
  VERCEL_PROXY_CIDRS,
} from "./index.ts"

const vercel = ["76.76.21.0/24", "2607:db00:8000::/44"]

afterEach(() => {
  vi.unstubAllEnvs()
})

function headers(input: Record<string, string>) {
  return new Headers(input)
}

describe("resolveTrustedProxies", () => {
  it("uses the built-in Vercel ranges when the env is empty", () => {
    delete process.env.AUTH_TRUSTED_PROXIES
    const builtIn = [...VERCEL_PROXY_CIDRS]
    expect(resolveTrustedProxies()).toEqual(builtIn)
    expect(resolveTrustedProxies(null)).toEqual(builtIn)
    expect(resolveTrustedProxies("")).toEqual(builtIn)
    expect(resolveTrustedProxies("   ")).toEqual(builtIn)
    expect(resolveTrustedProxies(",")).toEqual(builtIn)
    expect(resolveTrustedProxies(VERCEL_PROXY_CIDRS.join(","))).toEqual(builtIn)
  })

  it("reads AUTH_TRUSTED_PROXIES from the environment", () => {
    vi.stubEnv("AUTH_TRUSTED_PROXIES", " 203.0.113.0/24, 2001:db8::/32 ")
    expect(resolveTrustedProxies()).toEqual(["203.0.113.0/24", "2001:db8::/32"])
  })

  it("accepts a bare address and an IPv6 range", () => {
    expect(resolveTrustedProxies("76.76.21.22, 2607:db00:8000::/44")).toEqual([
      "76.76.21.22",
      "2607:db00:8000::/44",
    ])
  })

  it("rejects entries that are not an IP or CIDR", () => {
    for (const value of ["nope", "10.0.0.0/33", "::1/129", "10.0.0.0/8x", "76.76.21.0/24, nope"]) {
      expect(() => resolveTrustedProxies(value)).toThrow(INVALID_AUTH_TRUSTED_PROXIES)
    }
  })
})

describe("resolveAuthClientIp", () => {
  it("keys a direct caller by the peer Railway recorded", () => {
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "198.51.100.7",
          "x-forwarded-for": "203.0.113.10, 203.0.113.11",
          "x-vercel-forwarded-for": "203.0.113.99",
        }),
        vercel,
      ),
    ).toBe("198.51.100.7")
    expect(resolveAuthClientIp(headers({ "x-real-ip": "203.0.113.10" }), [])).toBe("203.0.113.10")
    expect(resolveAuthClientIp(headers({ "x-forwarded-for": "203.0.113.10" }), [])).toBe(
      "203.0.113.10",
    )
  })

  it("uses the visitor behind a trusted rewrite hop", () => {
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": "76.76.21.22",
          "x-vercel-forwarded-for": "203.0.113.10",
        }),
        vercel,
      ),
    ).toBe("203.0.113.10")
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "::ffff:76.76.21.22",
          "x-forwarded-for": "::ffff:76.76.21.22",
          "x-vercel-forwarded-for": "203.0.113.8",
        }),
        vercel,
      ),
    ).toBe("203.0.113.8")
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "2607:db00:8000::10",
          "x-forwarded-for": "2607:db00:8000::10",
          "x-vercel-forwarded-for": "2001:db8::20",
        }),
        vercel,
      ),
    ).toBe("2001:db8::20")
  })

  it("walks an appended chain from the right and ignores a spoofed left hop", () => {
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": " , 198.51.100.1, 203.0.113.10, 76.76.21.22",
          "x-vercel-forwarded-for": "203.0.113.99",
        }),
        vercel,
      ),
    ).toBe("203.0.113.10")
    expect(
      resolveAuthClientIp(headers({ "x-forwarded-for": "203.0.113.10, 76.76.21.22" }), vercel),
    ).toBeNull()
  })

  it("does not trust a multi-value chain when no proxy is configured", () => {
    expect(
      resolveAuthClientIp(headers({ "x-forwarded-for": "203.0.113.10, 198.51.100.1" }), []),
    ).toBeNull()
    expect(resolveAuthClientIp(headers({ "x-forwarded-for": "not-an-ip" }), [])).toBeNull()
    expect(
      resolveAuthClientIp(headers({ "x-real-ip": "203.0.113.10, 198.51.100.1" }), []),
    ).toBeNull()
    expect(
      resolveAuthClientIp(
        headers({ "x-real-ip": "not-an-ip", "x-forwarded-for": "203.0.113.10" }),
        [],
      ),
    ).toBe("203.0.113.10")
  })

  it("fail-closes when the trusted hop has no visitor", () => {
    const peerOnly = headers({
      "x-real-ip": "76.76.21.22",
      "x-forwarded-for": "76.76.21.22",
    })
    expect(resolveAuthClientIp(peerOnly, vercel)).toBeNull()
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": "not-an-ip, 76.76.21.22",
          "x-vercel-forwarded-for": "203.0.113.10, not-an-ip",
        }),
        vercel,
      ),
    ).toBeNull()
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": "76.76.21.22",
          "x-vercel-forwarded-for": "76.76.21.50",
        }),
        vercel,
      ),
    ).toBeNull()
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": "76.76.21.22",
          "x-vercel-forwarded-for": "::ffff:999.1.1.1",
        }),
        vercel,
      ),
    ).toBeNull()
  })

  it("ignores a broken proxy entry and still trusts the valid ones", () => {
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": "76.76.21.22",
          "x-vercel-forwarded-for": "203.0.113.10",
        }),
        ["nope", "76.76.21.0/24"],
      ),
    ).toBe("203.0.113.10")
    expect(resolveAuthClientIp(headers({ "x-forwarded-for": "203.0.113.10" }), ["nope"])).toBe(
      "203.0.113.10",
    )
  })

  it("reads the built-in ranges when no list is passed", () => {
    delete process.env.AUTH_TRUSTED_PROXIES
    expect(resolveAuthClientIp(headers({ "x-real-ip": "203.0.113.10" }))).toBe("203.0.113.10")
    expect(
      resolveAuthClientIp(
        headers({
          "x-real-ip": "76.76.21.22",
          "x-forwarded-for": "76.76.21.22",
          "x-vercel-forwarded-for": "203.0.113.10",
        }),
      ),
    ).toBe("203.0.113.10")
  })
})

describe("authRequestWithClientIp", () => {
  it("replaces x-forwarded-for with the visitor and keeps the body", async () => {
    const request = new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "76.76.21.22",
        "x-forwarded-for": "76.76.21.22",
        "x-vercel-forwarded-for": "203.0.113.10",
      },
      body: "{}",
    })
    const next = authRequestWithClientIp(request, vercel)
    expect(next.method).toBe("POST")
    expect(next.url).toBe("http://localhost/api/auth/sign-in/email")
    expect(next.headers.get("content-type")).toBe("application/json")
    expect(next.headers.get("x-forwarded-for")).toBe("203.0.113.10")
    expect(await next.text()).toBe("{}")
  })

  it("drops a forwarded chain that does not identify a visitor", () => {
    const request = new Request("http://localhost/api/auth/sign-in/email", {
      headers: {
        "x-real-ip": "76.76.21.22",
        "x-forwarded-for": "76.76.21.22",
      },
    })
    const next = authRequestWithClientIp(request, vercel)
    expect(next.headers.get("x-forwarded-for")).toBeNull()
  })

  it("uses the built-in ranges when no list is passed", () => {
    delete process.env.AUTH_TRUSTED_PROXIES
    const request = new Request("http://localhost/api/auth/ok", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    })
    expect(authRequestWithClientIp(request).headers.get("x-forwarded-for")).toBe("203.0.113.10")
  })
})
