const RESEND_ENDPOINT = "https://api.resend.com/emails"

/**
 * Resend rejects a payload that carries both `template` and `html`/`text`, so
 * this shape deliberately has no body fields: every email is a hosted template.
 */
export type ResendEmail = {
  from: string
  to: string
  subject: string
  template: { id: string; variables: Record<string, string> }
}

type ResendResponse = { ok: boolean; status: number; text: () => Promise<string> }
export type FetchLike = (input: string, init: RequestInit) => Promise<ResendResponse>

export type SendOptions = {
  apiKey: string
  idempotencyKey?: string
  fetchImpl?: FetchLike
}

export async function sendResendEmail(email: ResendEmail, options: SendOptions) {
  const call = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)
  const headers: Record<string, string> = {
    authorization: `Bearer ${options.apiKey}`,
    "content-type": "application/json",
  }
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey

  const response = await call(RESEND_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(email),
  })
  if (response.ok) return

  const detail = await response.text().catch(() => "")
  throw new Error(`Resend responded ${response.status}${detail ? `: ${detail}` : ""}`)
}
