import { describe, expect, it } from "vitest"
import { parseUserAgent } from "./index.ts"

describe("parseUserAgent", () => {
  it("names the browser, preferring the most specific token", () => {
    const cases: [string, string][] = [
      [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
        "Edge",
      ],
      [
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/126.0.0.0",
        "Opera",
      ],
      ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0", "Firefox"],
      [
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/140.0.0.0 Mobile Safari/537.36",
        "Samsung Internet",
      ],
      [
        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Chrome",
      ],
      [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/604.1",
        "Safari",
      ],
    ]
    for (const [userAgent, browser] of cases) {
      expect(parseUserAgent(userAgent).browser).toBe(browser)
    }
  })

  it("names the operating system", () => {
    const cases: [string, string][] = [
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Windows"],
      ["Mozilla/5.0 (Linux; Android 15; Pixel 9)", "Android"],
      ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", "iOS"],
      ["Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)", "ChromeOS"],
      ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "macOS"],
      ["Mozilla/5.0 (X11; Linux x86_64)", "Linux"],
    ]
    for (const [userAgent, os] of cases) {
      expect(parseUserAgent(userAgent).os).toBe(os)
    }
  })

  it("returns nulls for a missing or unrecognised agent", () => {
    expect(parseUserAgent(null)).toEqual({ browser: null, os: null })
    expect(parseUserAgent(undefined)).toEqual({ browser: null, os: null })
    expect(parseUserAgent("   ")).toEqual({ browser: null, os: null })
    expect(parseUserAgent("curl/8.7.1")).toEqual({ browser: null, os: null })
  })
})
