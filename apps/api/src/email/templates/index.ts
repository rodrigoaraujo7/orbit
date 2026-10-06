import { templateBase, type EmailKind, type EmailLocale } from "../config/index.ts"

/**
 * Resend hosts one published template per language, so the alias carries the
 * locale as a lowercase suffix: `orbit-login-otp-pt-br`.
 */
export function templateAlias(kind: EmailKind, locale: EmailLocale) {
  return `${templateBase(kind)}-${locale.toLowerCase()}`
}
