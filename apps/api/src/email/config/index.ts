import { optionalEnv } from "../../env/index.ts"

export const EMAIL_KINDS = ["login-otp", "confirm-account", "reset-password", "new-login"] as const
export type EmailKind = (typeof EMAIL_KINDS)[number]

export const EMAIL_LOCALES = ["en-US", "pt-BR"] as const
export type EmailLocale = (typeof EMAIL_LOCALES)[number]
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "en-US"

/** Minutes a login OTP stays valid. Mirrored in `twoFactor({ otpOptions: { period } })`. */
export const OTP_PERIOD_MINUTES = 10

export const DEFAULT_EMAIL_FROM = "Projects Manager <noreply@projectsmanager.rodrigoleite.dev>"
/** Resend only delivers from this address until the product domain is verified. */
export const FALLBACK_EMAIL_FROM = "Projects Manager <onboarding@resend.dev>"

const TEMPLATE_ENV: Record<EmailKind, string> = {
  "login-otp": "RESEND_TEMPLATE_LOGIN_OTP",
  "confirm-account": "RESEND_TEMPLATE_CONFIRM_ACCOUNT",
  "reset-password": "RESEND_TEMPLATE_RESET_PASSWORD",
  "new-login": "RESEND_TEMPLATE_NEW_LOGIN",
}

const TEMPLATE_DEFAULT: Record<EmailKind, string> = {
  "login-otp": "pm-login-otp",
  "confirm-account": "pm-confirm-account",
  "reset-password": "pm-reset-password",
  "new-login": "pm-new-login",
}

function setting(name: string) {
  const value = optionalEnv(name)?.trim()
  return value ? value : undefined
}

export const MISSING_RESEND_API_KEY = "missing env RESEND_API_KEY"

export function resendApiKey() {
  const key = setting("RESEND_API_KEY")
  if (!key) throw new Error(MISSING_RESEND_API_KEY)
  return key
}

export function emailFrom() {
  return setting("EMAIL_FROM") ?? DEFAULT_EMAIL_FROM
}

/** Alias of the published Resend template, before the locale suffix. */
export function templateBase(kind: EmailKind) {
  return setting(TEMPLATE_ENV[kind]) ?? TEMPLATE_DEFAULT[kind]
}

export function emailLocale(value: string | null | undefined): EmailLocale {
  return (EMAIL_LOCALES as readonly string[]).includes(value ?? "")
    ? (value as EmailLocale)
    : DEFAULT_EMAIL_LOCALE
}
