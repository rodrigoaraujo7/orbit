import { describe, expect, it } from "vitest"
import { forwardedVisitorHeaders, VISITOR_IP_HEADER } from "./index"

describe("forwardedVisitorHeaders", () => {
  it("replaces a client-supplied visitor header with Vercel's x-real-ip", () => {
    const headers = forwardedVisitorHeaders(
      new Headers({
        "x-real-ip": "203.0.113.10",
        [VISITOR_IP_HEADER]: "198.51.100.99",
        cookie: "session=abc",
      }),
    )
    expect(headers.get(VISITOR_IP_HEADER)).toBe("203.0.113.10")
    expect(headers.get("cookie")).toBe("session=abc")
    expect(headers.get("x-real-ip")).toBe("203.0.113.10")
  })

  it("leaves the visitor header alone when Vercel did not set x-real-ip", () => {
    expect(forwardedVisitorHeaders(new Headers()).get(VISITOR_IP_HEADER)).toBeNull()
    const supplied = new Headers({
      "x-real-ip": "   ",
      [VISITOR_IP_HEADER]: "198.51.100.99",
    })
    expect(forwardedVisitorHeaders(supplied).get(VISITOR_IP_HEADER)).toBe("198.51.100.99")
  })
})
