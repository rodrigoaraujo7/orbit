export const SITE_URL = "https://orbit.rodrigoleite.dev"
const DEFAULT_APP_URL = "https://app.orbit.rodrigoleite.dev"

export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL
  return configured.replace(/\/$/, "")
}

export function signInUrl(): string {
  return `${appOrigin()}/login`
}

export function signUpUrl(): string {
  return `${appOrigin()}/login?mode=signup`
}
