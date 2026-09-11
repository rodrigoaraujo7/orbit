import type { EmailKind, EmailLocale } from "../config/index.ts"

/**
 * A subject on the payload overrides the default stored with the template, so
 * these strings are the single source of truth for what lands in the inbox.
 */
const SUBJECTS: Record<EmailLocale, Record<EmailKind, string>> = {
  "en-US": {
    "login-otp": "Your Projects Manager sign-in code",
    "confirm-account": "Confirm your Projects Manager account",
    "reset-password": "Reset your Projects Manager password",
    "new-login": "New sign-in to your Projects Manager account",
  },
  "pt-BR": {
    "login-otp": "Seu código de acesso do Projects Manager",
    "confirm-account": "Confirme sua conta do Projects Manager",
    "reset-password": "Redefina sua senha do Projects Manager",
    "new-login": "Novo acesso à sua conta do Projects Manager",
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
