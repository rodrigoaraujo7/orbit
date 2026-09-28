import { describe, expect, it } from "vitest"

import { renderedPathname, showStopScreen } from "./-rendered-path"

const isPublic = (path: string) => path === "/login"

describe("renderedPathname", () => {
  it("keeps the mounted private page while the address bar moves to a public route", () => {
    expect(
      renderedPathname(
        "/login",
        "pending",
        [{ routeId: "/dashboard", pathname: "/dashboard" }],
        isPublic,
      ),
    ).toBe("/dashboard")
  })

  it("follows the address bar once the navigation has settled", () => {
    expect(
      renderedPathname(
        "/login",
        "idle",
        [{ routeId: "/dashboard", pathname: "/dashboard" }],
        isPublic,
      ),
    ).toBe("/login")
  })

  it("follows a private destination while a public page is still mounted", () => {
    expect(
      renderedPathname(
        "/dashboard",
        "pending",
        [{ routeId: "/login", pathname: "/login" }],
        isPublic,
      ),
    ).toBe("/dashboard")
  })

  it("keeps the address bar when the only match is the root", () => {
    expect(
      renderedPathname("/login", "pending", [{ routeId: "__root__", pathname: "/" }], isPublic),
    ).toBe("/login")
  })

  it("keeps the address bar when there is no match yet", () => {
    expect(renderedPathname("/projects", "pending", undefined, isPublic)).toBe("/projects")
    expect(renderedPathname("/projects", "pending", [], isPublic)).toBe("/projects")
  })
})

describe("showStopScreen", () => {
  it("waits until the navigation settles", () => {
    expect(showStopScreen("pending", true, false)).toBe(false)
    expect(showStopScreen("pending", false, true)).toBe(false)
    expect(showStopScreen("idle", true, false)).toBe(true)
    expect(showStopScreen("idle", false, true)).toBe(true)
    expect(showStopScreen("idle", false, false)).toBe(false)
    expect(showStopScreen(undefined, true, false)).toBe(true)
  })
})
