import { optionalEnv } from "../../env/index.ts"

export const MISSING_BETTER_AUTH_SECRET = "missing env BETTER_AUTH_SECRET"

/** Public fallbacks that must never sign sessions. */
export const INSECURE_BETTER_AUTH_SECRET = "dev-only-better-auth-secret-not-for-production"
export const BETTER_AUTH_LIBRARY_DEFAULT_SECRET = "better-auth-secret-12345678901234567890"

const insecureSecrets = new Set<string>([
  INSECURE_BETTER_AUTH_SECRET,
  BETTER_AUTH_LIBRARY_DEFAULT_SECRET,
])

/**
 * An omitted argument reads `BETTER_AUTH_SECRET`. An explicit `undefined` is missing
 * and must not fall back to the environment — a default parameter treats those calls
 * as the same, so a build that injects the secret would accept the missing value.
 */
export function resolveBetterAuthSecret(value?: string | null): string
export function resolveBetterAuthSecret(...passed: (string | null | undefined)[]): string {
  const value = passed.length === 0 ? optionalEnv("BETTER_AUTH_SECRET") : passed[0]
  const secret = value?.trim() ?? ""
  if (!secret) {
    throw new Error(MISSING_BETTER_AUTH_SECRET)
  }
  if (insecureSecrets.has(secret)) {
    throw new Error("BETTER_AUTH_SECRET must not use a known insecure default")
  }
  return secret
}

export function isBetterAuthSecretError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.message === MISSING_BETTER_AUTH_SECRET ||
      error.message.includes("known insecure default"))
  )
}
