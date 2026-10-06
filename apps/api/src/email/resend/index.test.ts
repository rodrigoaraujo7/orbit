import { afterEach, describe, expect, it, vi } from "vitest"
import { sendResendEmail, type FetchLike } from "./index.ts"

const email = {
  from: "Orbit <noreply@orbit.rodrigoleite.dev>",
  to: ["ada@test.local"],
  subject: "Your Orbit sign-in code",
  template: { id: "orbit-login-otp-en-us", variables: { CODE: "123456" } },
}

function ok() {
  return { ok: true, status: 200, text: async () => "{}" }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("sendResendEmail", () => {
  it("posts the template payload with the API key", async () => {
    const call = vi.fn(async () => ok()) as unknown as FetchLike
    await sendResendEmail(email, {
      apiKey: "re_test",
      idempotencyKey: "login-otp-abc",
      fetchImpl: call,
    })

    expect(call).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer re_test",
        "content-type": "application/json",
        "Idempotency-Key": "login-otp-abc",
      },
      body: JSON.stringify(email),
    })
    expect(JSON.parse(String(vi.mocked(call).mock.calls[0][1].body))).not.toHaveProperty("html")
  })

  it("omits the idempotency header when there is no key", async () => {
    const call = vi.fn(async () => ok()) as unknown as FetchLike
    await sendResendEmail(email, { apiKey: "re_test", fetchImpl: call })
    expect(vi.mocked(call).mock.calls[0][1].headers).not.toHaveProperty("Idempotency-Key")
  })

  it("uses the global fetch when none is injected", async () => {
    const global = vi.fn(async () => ok())
    vi.stubGlobal("fetch", global)
    await sendResendEmail(email, { apiKey: "re_test" })
    expect(global).toHaveBeenCalledOnce()
  })

  it("throws with the response body on a failure", async () => {
    const call = vi.fn(async () => ({
      ok: false,
      status: 422,
      text: async () => '{"message":"invalid template"}',
    })) as unknown as FetchLike
    await expect(sendResendEmail(email, { apiKey: "re_test", fetchImpl: call })).rejects.toThrow(
      'Resend responded 422: {"message":"invalid template"}',
    )
  })

  it("throws without a body when the error payload cannot be read", async () => {
    const empty = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "",
    })) as unknown as FetchLike
    await expect(sendResendEmail(email, { apiKey: "re_test", fetchImpl: empty })).rejects.toThrow(
      "Resend responded 500",
    )

    const broken = vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => {
        throw new Error("stream closed")
      },
    })) as unknown as FetchLike
    await expect(sendResendEmail(email, { apiKey: "re_test", fetchImpl: broken })).rejects.toThrow(
      "Resend responded 502",
    )
  })
})
