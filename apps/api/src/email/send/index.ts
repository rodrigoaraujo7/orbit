import { createHash } from "node:crypto"
import {
  emailFrom,
  FALLBACK_EMAIL_FROM,
  emailLocale,
  OTP_PERIOD_MINUTES,
  resendApiKey,
  type EmailKind,
  type EmailLocale,
} from "../config/index.ts"
import { clientIp } from "../client-ip/index.ts"
import { emailSubject, unknownLabel } from "../messages/index.ts"
import { sendResendEmail, type FetchLike } from "../resend/index.ts"
import { templateAlias } from "../templates/index.ts"
import { parseUserAgent } from "../user-agent/index.ts"

export type EmailRecipient = {
  email: string
  name?: string | null
  locale?: string | null
}

export type SignInContext = {
  headers?: Headers | null
  at?: Date
}

/** Test seam: the senders call Resend through `fetch` unless one is supplied. */
export type DeliverOptions = { fetchImpl?: FetchLike }

function idempotencyKey(
  kind: EmailKind,
  to: string,
  from: string,
  variables: Record<string, string>,
) {
  const digest = createHash("sha256")
    .update(`${kind}\n${to}\n${from}\n${JSON.stringify(variables)}`)
    .digest("hex")
  return `${kind}-${digest}`
}

export function isUnverifiedSender(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /not verified|unverified domain/i.test(message)
}

async function deliver(
  kind: EmailKind,
  recipient: EmailRecipient,
  variables: Record<string, string>,
  options: DeliverOptions = {},
) {
  const locale = emailLocale(recipient.locale)
  const subject = emailSubject(kind, locale)
  const apiKey = resendApiKey()

  if (!apiKey) {
    console.info(`[email:dev] ${kind} to ${recipient.email} — ${subject}`, variables)
    return
  }

  const payload = {
    to: [recipient.email],
    subject,
    template: { id: templateAlias(kind, locale), variables },
  }
  const from = emailFrom()

  try {
    await sendResendEmail(
      { from, ...payload },
      {
        apiKey,
        idempotencyKey: idempotencyKey(kind, recipient.email, from, variables),
        fetchImpl: options.fetchImpl,
      },
    )
  } catch (error) {
    if (from !== FALLBACK_EMAIL_FROM && isUnverifiedSender(error)) {
      try {
        await sendResendEmail(
          { from: FALLBACK_EMAIL_FROM, ...payload },
          {
            apiKey,
            idempotencyKey: idempotencyKey(kind, recipient.email, FALLBACK_EMAIL_FROM, variables),
            fetchImpl: options.fetchImpl,
          },
        )
        return
      } catch (retryError) {
        console.error(`failed to send the ${kind} email`, retryError)
        return
      }
    }
    console.error(`failed to send the ${kind} email`, error)
  }
}

function displayName(recipient: EmailRecipient) {
  const name = recipient.name?.trim()
  return name ? name : recipient.email
}

function formatSignInTime(at: Date, locale: EmailLocale) {
  const formatted = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(at)
  return `${formatted} (UTC)`
}

export function sendLoginOtp(user: EmailRecipient, otp: string, options?: DeliverOptions) {
  return deliver(
    "login-otp",
    user,
    { NAME: displayName(user), CODE: otp, MINUTES: String(OTP_PERIOD_MINUTES) },
    options,
  )
}

export function sendAccountConfirmation(
  user: EmailRecipient,
  url: string,
  options?: DeliverOptions,
) {
  return deliver("confirm-account", user, { NAME: displayName(user), URL: url }, options)
}

export function sendPasswordReset(user: EmailRecipient, url: string, options?: DeliverOptions) {
  return deliver("reset-password", user, { NAME: displayName(user), URL: url }, options)
}

export function sendNewLoginAlert(
  user: EmailRecipient,
  context: SignInContext = {},
  options?: DeliverOptions,
) {
  const locale = emailLocale(user.locale)
  const unknown = unknownLabel(locale)
  const { browser, os } = parseUserAgent(context.headers?.get("user-agent"))
  return deliver(
    "new-login",
    user,
    {
      NAME: displayName(user),
      BROWSER: browser ?? unknown,
      OS: os ?? unknown,
      IP: clientIp(context.headers) ?? unknown,
      WHEN: formatSignInTime(context.at ?? new Date(), locale),
    },
    options,
  )
}
