import { describe, expect, it, vi } from "vitest"
import {
  SECURITY_KEYS,
  focusSecurityTab,
  focusStaysInside,
  securityKeyFromKey,
  stepSecurityKey,
} from "./cycle"

describe("security cycle", () => {
  it("steps forward and wraps to the first control", () => {
    expect(stepSecurityKey("isolation", 1)).toBe("encryption")
    expect(stepSecurityKey("encryption", 1)).toBe("emailCode")
    expect(stepSecurityKey("emailCode", 1)).toBe("isolation")
  })

  it("steps backward and wraps to the last control", () => {
    expect(stepSecurityKey("isolation", -1)).toBe("emailCode")
    expect(stepSecurityKey("emailCode", -1)).toBe("encryption")
  })

  it("maps arrow, home, and end keys, and ignores everything else", () => {
    expect(securityKeyFromKey("isolation", "ArrowDown")).toBe("encryption")
    expect(securityKeyFromKey("isolation", "ArrowRight")).toBe("encryption")
    expect(securityKeyFromKey("encryption", "ArrowUp")).toBe("isolation")
    expect(securityKeyFromKey("encryption", "ArrowLeft")).toBe("isolation")
    expect(securityKeyFromKey("emailCode", "Home")).toBe("isolation")
    expect(securityKeyFromKey("isolation", "End")).toBe("emailCode")
    expect(securityKeyFromKey("isolation", "a")).toBeNull()
    expect(SECURITY_KEYS).toEqual(["isolation", "encryption", "emailCode"])
  })

  it("focuses the matching tab and does nothing when it is missing", () => {
    const list = document.createElement("div")
    const tab = document.createElement("button")
    tab.id = "security-tab-encryption"
    const focus = vi.fn()
    tab.focus = focus
    list.append(tab)

    focusSecurityTab(list, "encryption")
    expect(focus).toHaveBeenCalledOnce()

    focusSecurityTab(list, "isolation")
    expect(focus).toHaveBeenCalledOnce()
  })

  it("keeps autoplay paused only while focus remains inside the console", () => {
    const current = document.createElement("div")
    const child = document.createElement("button")
    current.append(child)
    const outside = document.createElement("button")

    expect(focusStaysInside(current, child)).toBe(true)
    expect(focusStaysInside(current, outside)).toBe(false)
    expect(focusStaysInside(current, null)).toBe(false)
    expect(focusStaysInside(current, window)).toBe(false)
  })
})
