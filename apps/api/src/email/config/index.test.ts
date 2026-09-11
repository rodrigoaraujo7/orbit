import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_EMAIL_FROM,
  FALLBACK_EMAIL_FROM,
  DEFAULT_EMAIL_LOCALE,
  EMAIL_KINDS,
  EMAIL_LOCALES,
  emailFrom,
  emailLocale,
  OTP_PERIOD_MINUTES,
  resendApiKey,
  templateBase,
} from "./index.ts"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("email config", () => {
  it("requires a non-blank API key", () => {
    delete process.env.RESEND_API_KEY
    expect(() => resendApiKey()).toThrow(/missing env RESEND_API_KEY/)

    vi.stubEnv("RESEND_API_KEY", "   ")
    expect(() => resendApiKey()).toThrow(/missing env RESEND_API_KEY/)

    vi.stubEnv("RESEND_API_KEY", " re_test_key ")
    expect(resendApiKey()).toBe("re_test_key")
  })

  it("falls back to the project sender", () => {
    delete process.env.EMAIL_FROM
    expect(emailFrom()).toBe(DEFAULT_EMAIL_FROM)
    expect(FALLBACK_EMAIL_FROM).toContain("onboarding@resend.dev")
    vi.stubEnv("EMAIL_FROM", "Ada <ada@test.local>")
    expect(emailFrom()).toBe("Ada <ada@test.local>")
  })

  it("defaults every template alias and lets env override it", () => {
    for (const kind of EMAIL_KINDS) delete process.env[`RESEND_TEMPLATE_${kind}`]
    expect(EMAIL_KINDS.map((kind) => templateBase(kind))).toEqual([
      "pm-login-otp",
      "pm-confirm-account",
      "pm-reset-password",
      "pm-new-login",
    ])

    vi.stubEnv("RESEND_TEMPLATE_LOGIN_OTP", "custom-otp")
    vi.stubEnv("RESEND_TEMPLATE_CONFIRM_ACCOUNT", "custom-confirm")
    vi.stubEnv("RESEND_TEMPLATE_RESET_PASSWORD", "custom-reset")
    vi.stubEnv("RESEND_TEMPLATE_NEW_LOGIN", "custom-login")
    expect(EMAIL_KINDS.map((kind) => templateBase(kind))).toEqual([
      "custom-otp",
      "custom-confirm",
      "custom-reset",
      "custom-login",
    ])
  })

  it("narrows any stored locale to a supported one", () => {
    expect(EMAIL_LOCALES).toEqual(["en-US", "pt-BR"])
    expect(emailLocale("pt-BR")).toBe("pt-BR")
    expect(emailLocale("en-US")).toBe("en-US")
    expect(emailLocale("fr-FR")).toBe(DEFAULT_EMAIL_LOCALE)
    expect(emailLocale(null)).toBe(DEFAULT_EMAIL_LOCALE)
    expect(emailLocale(undefined)).toBe(DEFAULT_EMAIL_LOCALE)
  })

  it("keeps the OTP window in minutes", () => {
    expect(OTP_PERIOD_MINUTES).toBe(10)
  })
})
