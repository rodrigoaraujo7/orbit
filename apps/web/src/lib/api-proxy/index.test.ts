import { describe, expect, it } from "vitest"

import { PRODUCTION_API_ORIGIN, apiProxyUrl, resolveApiProxyOrigin } from "./index.ts"

describe("resolveApiProxyOrigin", () => {
  it("uses the production API when the preview target is missing", () => {
    expect(resolveApiProxyOrigin(undefined)).toBe(PRODUCTION_API_ORIGIN)
    expect(resolveApiProxyOrigin("  ")).toBe(PRODUCTION_API_ORIGIN)
  })

  it("keeps only the origin of a preview API URL", () => {
    expect(resolveApiProxyOrigin("https://api-preview.up.railway.app/trpc")).toBe(
      "https://api-preview.up.railway.app",
    )
  })
})

describe("apiProxyUrl", () => {
  it("sends the incoming path and query to the API origin", () => {
    expect(
      apiProxyUrl(
        "https://preview.vercel.app/api/auth/sign-up/email?token=1",
        "https://api-preview.up.railway.app",
      ),
    ).toBe("https://api-preview.up.railway.app/api/auth/sign-up/email?token=1")
  })
})
