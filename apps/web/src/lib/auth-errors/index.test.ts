import { describe, expect, it } from "vitest"
import { authErrorMessage } from "./index"

describe("authErrorMessage", () => {
  it("maps known codes, 429 and fallbacks", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" }, "x")).not.toBe("x")
    expect(authErrorMessage({ code: "EMAIL_NOT_VERIFIED" }, "x")).toBe(
      "Confirm your email before signing in. We just sent a new link.",
    )
    expect(authErrorMessage({ code: "INVALID_TOKEN" }, "x")).toBe(
      "This link is invalid or has expired.",
    )
    expect(authErrorMessage({ status: 429 }, "x")).not.toBe("x")
    expect(authErrorMessage({ code: "UNKNOWN" }, "fallback")).toBe("fallback")
    expect(authErrorMessage({}, "fallback")).toBe("fallback")
  })
})
