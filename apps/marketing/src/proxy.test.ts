import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { config, localeRedirect, proxy } from "./proxy"

describe("localeRedirect", () => {
  it("sends the root to the negotiated locale", () => {
    expect(localeRedirect("/", "pt-BR")).toBe("/pt-BR")
    expect(localeRedirect("/", null)).toBe("/en")
  })

  it("prefixes a path that has no locale", () => {
    expect(localeRedirect("/pricing", "en-US")).toBe("/en/pricing")
  })

  it("leaves a locale-prefixed path alone", () => {
    expect(localeRedirect("/en", null)).toBeNull()
    expect(localeRedirect("/pt-BR/faq", "en")).toBeNull()
  })
})

describe("proxy", () => {
  it("redirects the apex path", () => {
    const response = proxy(
      new NextRequest("https://projectsmanager.rodrigoleite.dev/", {
        headers: { "accept-language": "pt-BR,pt;q=0.9" },
      }),
    )
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://projectsmanager.rodrigoleite.dev/pt-BR")
  })

  it("continues when the locale is already in the path", () => {
    const response = proxy(new NextRequest("https://projectsmanager.rodrigoleite.dev/en"))
    expect(response.headers.get("location")).toBeNull()
    expect(response.status).not.toBe(307)
  })

  it("exposes a matcher that skips static assets", () => {
    expect(config.matcher).toEqual(["/", "/((?!_next/static|_next/image|.*\\..*).*)"])
  })
})
