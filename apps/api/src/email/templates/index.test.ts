import { afterEach, describe, expect, it, vi } from "vitest"
import { EMAIL_KINDS } from "../config/index.ts"
import { templateAlias } from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("templateAlias", () => {
  it("suffixes the published alias with the lowercase locale", () => {
    expect(EMAIL_KINDS.map((kind) => templateAlias(kind, "en-US"))).toEqual([
      "orbit-login-otp-en-us",
      "orbit-confirm-account-en-us",
      "orbit-reset-password-en-us",
      "orbit-new-login-en-us",
    ])
    expect(EMAIL_KINDS.map((kind) => templateAlias(kind, "pt-BR"))).toEqual([
      "orbit-login-otp-pt-br",
      "orbit-confirm-account-pt-br",
      "orbit-reset-password-pt-br",
      "orbit-new-login-pt-br",
    ])
  })

  it("follows an overridden base alias", () => {
    vi.stubEnv("RESEND_TEMPLATE_LOGIN_OTP", "staging-otp")
    expect(templateAlias("login-otp", "pt-BR")).toBe("staging-otp-pt-br")
  })
})
