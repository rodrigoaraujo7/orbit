import { describe, expect, it } from "vitest"
import { clientIp } from "./index.ts"

describe("clientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1 " })
    expect(clientIp(headers)).toBe("203.0.113.9")
  })

  it("falls back to x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": " 198.51.100.7 " }))).toBe("198.51.100.7")
    expect(clientIp(new Headers({ "x-forwarded-for": " , 10.0.0.1", "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    )
  })

  it("returns null without any address header", () => {
    expect(clientIp(new Headers())).toBeNull()
    expect(clientIp(new Headers({ "x-real-ip": "   " }))).toBeNull()
    expect(clientIp(null)).toBeNull()
    expect(clientIp(undefined)).toBeNull()
  })
})
