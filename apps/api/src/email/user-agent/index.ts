/**
 * Enough User-Agent parsing to tell someone which browser signed in. No
 * dependency and no version numbers — the alert only needs a recognisable name.
 */
export type UserAgentInfo = { browser: string | null; os: string | null }

const BROWSERS: [RegExp, string][] = [
  [/\bEdg(?:e|A|iOS)?\//, "Edge"],
  [/\bOPR\/|\bOpera\//, "Opera"],
  [/\bFirefox\/|\bFxiOS\//, "Firefox"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\bChrome\/|\bCriOS\//, "Chrome"],
  [/\bSafari\//, "Safari"],
]

const SYSTEMS: [RegExp, string][] = [
  [/\bWindows NT\b/, "Windows"],
  [/\bAndroid\b/, "Android"],
  [/\b(?:iPhone|iPad|iPod)\b/, "iOS"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bMac OS X\b|\bMacintosh\b/, "macOS"],
  [/\bLinux\b/, "Linux"],
]

function firstMatch(pairs: [RegExp, string][], value: string) {
  for (const [pattern, label] of pairs) {
    if (pattern.test(value)) return label
  }
  return null
}

export function parseUserAgent(userAgent: string | null | undefined): UserAgentInfo {
  const value = userAgent?.trim()
  if (!value) return { browser: null, os: null }
  return { browser: firstMatch(BROWSERS, value), os: firstMatch(SYSTEMS, value) }
}
