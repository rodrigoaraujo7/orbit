import type { EmailKind, EmailLocale } from "../config/index.ts"

/**
 * A subject on the payload overrides the default stored with the template, so
 * these strings are the single source of truth for what lands in the inbox.
 */
const SUBJECTS: Record<EmailLocale, Record<EmailKind, string>> = {
  "en-US": {
    "login-otp": "Your Orbit sign-in code",
    "confirm-account": "Confirm your Orbit account",
    "reset-password": "Reset your Orbit password",
    "new-login": "New sign-in to your Orbit account",
  },
  "pt-BR": {
    "login-otp": "Seu código de acesso do Orbit",
    "confirm-account": "Confirme sua conta do Orbit",
    "reset-password": "Redefina sua senha do Orbit",
    "new-login": "Novo acesso à sua conta do Orbit",
  },
}

const UNKNOWN: Record<EmailLocale, string> = {
  "en-US": "Unknown",
  "pt-BR": "Desconhecido",
}

export function emailSubject(kind: EmailKind, locale: EmailLocale) {
  return SUBJECTS[locale][kind]
}

/** Placeholder for a sign-in detail the request did not carry. */
export function unknownLabel(locale: EmailLocale) {
  return UNKNOWN[locale]
}
