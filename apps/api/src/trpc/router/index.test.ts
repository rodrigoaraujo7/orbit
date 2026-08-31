import { describe, expect, it } from "vitest"
import { appRouter } from "./router.ts"

describe("appRouter", () => {
  it("mounts every domain router", () => {
    expect(appRouter.audit).toBeTruthy()
    expect(appRouter.contacts).toBeTruthy()
    expect(appRouter.dashboard).toBeTruthy()
    expect(appRouter.projects).toBeTruthy()
    expect(appRouter.tools).toBeTruthy()
    expect(appRouter.invoices).toBeTruthy()
    expect(appRouter.payments).toBeTruthy()
    expect(appRouter.credentials).toBeTruthy()
  })
})
