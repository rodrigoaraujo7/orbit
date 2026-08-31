import { describe, expect, it } from "vitest"
import { authClient } from "./auth-client.ts"

describe("authClient", () => {
  it("exposes session and credential helpers", () => {
    expect(typeof authClient.useSession).toBe("function")
    expect(authClient.signIn).toBeTruthy()
    expect(authClient.signUp).toBeTruthy()
    expect(authClient.twoFactor).toBeTruthy()
  })
})
