import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FetchLike } from "../resend/index.ts"
import {
  sendAccountConfirmation,
  sendLoginOtp,
  sendNewLoginAlert,
  sendPasswordReset,
} from "./index.ts"

const ada = { email: "ada@test.local", name: "Ada Lovelace", locale: "en-US" }
const AT = new Date("2026-09-11T17:42:00.000Z")

type Sent = { headers: Record<string, string>; body: Record<string, unknown> }

function recorder() {
  const sent: Sent[] = []
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    sent.push({
      headers: init.headers as Record<string, string>,
      body: JSON.parse(String(init.body)),
    })
    return { ok: true, status: 200, text: async () => "{}" }
  }) as unknown as FetchLike
  return { sent, fetchImpl }
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test")
  vi.stubEnv("EMAIL_FROM", "Projects Manager <noreply@projectsmanager.rodrigoleite.dev>")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("email senders", () => {
  it("sends the login OTP with the code and its lifetime", async () => {
    const { sent, fetchImpl } = recorder()
    await sendLoginOtp(ada, "123456", { fetchImpl })

    expect(sent[0].body).toEqual({
      from: "Projects Manager <noreply@projectsmanager.rodrigoleite.dev>",
      to: "ada@test.local",
      subject: "Your Projects Manager sign-in code",
      template: {
        id: "pm-login-otp-en-us",
        variables: { name: "Ada Lovelace", code: "123456", minutes: "10" },
      },
    })
    expect(sent[0].headers["Idempotency-Key"]).toMatch(/^login-otp-[0-9a-f]{64}$/)
  })

  it("sends confirmation and reset links", async () => {
    const { sent, fetchImpl } = recorder()
    await sendAccountConfirmation(ada, "https://app.test/verify?token=abc", { fetchImpl })
    await sendPasswordReset(
      { ...ada, locale: "pt-BR" },
      "https://app.test/reset-password?token=xyz",
      { fetchImpl },
    )

    expect(sent[0].body).toMatchObject({
      subject: "Confirm your Projects Manager account",
      template: {
        id: "pm-confirm-account-en-us",
        variables: { name: "Ada Lovelace", url: "https://app.test/verify?token=abc" },
      },
    })
    expect(sent[1].body).toMatchObject({
      subject: "Redefina sua senha do Projects Manager",
      template: {
        id: "pm-reset-password-pt-br",
        variables: { url: "https://app.test/reset-password?token=xyz" },
      },
    })
  })

  it("describes the device, address and time on a new login", async () => {
    const { sent, fetchImpl } = recorder()
    const headers = new Headers({
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
    })
    await sendNewLoginAlert(ada, { headers, at: AT }, { fetchImpl })

    const variables = (sent[0].body.template as { variables: Record<string, string> }).variables
    expect(variables).toMatchObject({ browser: "Chrome", os: "macOS", ip: "203.0.113.9" })
    expect(variables.when).toContain("2026")
    expect(variables.when).toContain("(UTC)")
  })

  it("labels unknown sign-in details in the recipient locale", async () => {
    const { sent, fetchImpl } = recorder()
    await sendNewLoginAlert({ ...ada, locale: "pt-BR" }, { at: AT }, { fetchImpl })
    await sendNewLoginAlert({ email: "ghost@test.local", name: "  " }, { at: AT }, { fetchImpl })

    expect((sent[0].body.template as { variables: Record<string, string> }).variables).toMatchObject({
      browser: "Desconhecido",
      os: "Desconhecido",
      ip: "Desconhecido",
    })
    expect((sent[1].body.template as { variables: Record<string, string> }).variables).toMatchObject({
      name: "ghost@test.local",
      browser: "Unknown",
    })
  })

  it("stamps the current time when the caller has none", async () => {
    const { sent, fetchImpl } = recorder()
    vi.useFakeTimers()
    vi.setSystemTime(AT)
    await sendNewLoginAlert(ada, {}, { fetchImpl })
    vi.useRealTimers()

    const variables = (sent[0].body.template as { variables: Record<string, string> }).variables
    expect(variables.when).toContain("2026")
  })

  it("logs to the console instead of calling Resend without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    const { sent, fetchImpl } = recorder()

    await sendLoginOtp(ada, "654321", { fetchImpl })

    expect(sent).toEqual([])
    expect(info).toHaveBeenCalledWith(
      "[email:dev] login-otp to ada@test.local — Your Projects Manager sign-in code",
      { name: "Ada Lovelace", code: "654321", minutes: "10" },
    )
  })

  it("swallows a Resend failure so the auth flow still completes", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const failing = (async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })) as unknown as FetchLike

    await expect(sendLoginOtp(ada, "111111", { fetchImpl: failing })).resolves.toBeUndefined()
    expect(error).toHaveBeenCalledWith("failed to send the login-otp email", expect.any(Error))
  })

  it("reuses the same idempotency key for identical content", async () => {
    const { sent, fetchImpl } = recorder()
    await sendPasswordReset(ada, "https://app.test/reset-password?token=xyz", { fetchImpl })
    await sendPasswordReset(ada, "https://app.test/reset-password?token=xyz", { fetchImpl })
    await sendPasswordReset(ada, "https://app.test/reset-password?token=other", { fetchImpl })

    expect(sent[0].headers["Idempotency-Key"]).toBe(sent[1].headers["Idempotency-Key"])
    expect(sent[0].headers["Idempotency-Key"]).not.toBe(sent[2].headers["Idempotency-Key"])
  })
})
