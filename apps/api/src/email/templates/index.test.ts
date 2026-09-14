import { afterEach, describe, expect, it, vi } from "vitest"
import { EMAIL_KINDS } from "../config/index.ts"
import { templateAlias } from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("templateAlias", () => {
  it("suffixes the published alias with the lowercase locale", () => {
    expect(EMAIL_KINDS.map((kind) => templateAlias(kind, "en-US"))).toEqual([
      "pm-login-otp-en-us",
      "pm-confirm-account-en-us",
      "pm-reset-password-en-us",
      "pm-new-login-en-us",
    ])
    expect(EMAIL_KINDS.map((kind) => templateAlias(kind, "pt-BR"))).toEqual([
      "pm-login-otp-pt-br",
      "pm-confirm-account-pt-br",
      "pm-reset-password-pt-br",
      "pm-new-login-pt-br",
    ])
  })

  it("follows an overridden base alias", () => {
    vi.stubEnv("RESEND_TEMPLATE_LOGIN_OTP", "staging-otp")
    expect(templateAlias("login-otp", "pt-BR")).toBe("staging-otp-pt-br")
  })
})
