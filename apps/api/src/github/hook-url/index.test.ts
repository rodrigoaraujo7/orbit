import { afterEach, describe, expect, it } from "vitest"
import { webOrigin } from "../../web-origin/index.ts"
import { WEBHOOK_PATH, webhookUrl } from "./index.ts"

const original = process.env.PUBLIC_API_URL

afterEach(() => {
  if (original === undefined) delete process.env.PUBLIC_API_URL
  else process.env.PUBLIC_API_URL = original
})

describe("webhookUrl", () => {
  it("falls back to the web origin", () => {
    delete process.env.PUBLIC_API_URL
    expect(webhookUrl("hook-1")).toBe(`${webOrigin}${WEBHOOK_PATH}/hook-1`)
  })

  it("prefers PUBLIC_API_URL and drops its trailing slash", () => {
    process.env.PUBLIC_API_URL = "https://tunnel.example.com/"
    expect(webhookUrl("hook-1")).toBe(`https://tunnel.example.com${WEBHOOK_PATH}/hook-1`)
  })
})
