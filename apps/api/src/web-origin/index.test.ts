import { describe, expect, it } from "vitest"
import { webOriginAliases, resolveWebOrigin, resolveAuthBaseUrl } from "./index.ts"

const loopbackHost = "localhost"
const localOrigin = `http://${loopbackHost}:5173`
const ipv4Origin = "http://127.0.0.1:5173"

describe("webOriginAliases", () => {
  it("pairs localhost with the loopback address and keeps port and protocol", () => {
    expect(webOriginAliases(localOrigin).sort()).toEqual([ipv4Origin, localOrigin].sort())
    expect(webOriginAliases(ipv4Origin).sort()).toEqual([ipv4Origin, localOrigin].sort())
    expect(webOriginAliases("https://localhost").sort()).toEqual(
      ["https://127.0.0.1", "https://localhost"].sort(),
    )
  })

  it("leaves other hosts and invalid values unchanged", () => {
    expect(webOriginAliases("https://app.example.com")).toEqual(["https://app.example.com"])
    expect(webOriginAliases("not a url")).toEqual(["not a url"])
    expect(webOriginAliases("  ")).toEqual([])
  })
})

describe("resolveWebOrigin", () => {
  it("uses the given origin and falls back to the local Vite port", () => {
    expect(resolveWebOrigin("https://app.example.com")).toBe("https://app.example.com")
    expect(resolveWebOrigin(null)).toBe(localOrigin)
  })
})

describe("resolveAuthBaseUrl", () => {
  it("uses BETTER_AUTH_URL when set and otherwise the web origin", () => {
    expect(resolveAuthBaseUrl("https://auth.example.com")).toBe("https://auth.example.com")
    expect(resolveAuthBaseUrl(null)).toBe(resolveWebOrigin())
  })
})
