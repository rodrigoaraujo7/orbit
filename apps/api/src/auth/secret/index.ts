import { optionalEnv } from "../../env/index.ts"

/** Public fallback previously used outside production. Never accept it as a real secret. */
export const INSECURE_BETTER_AUTH_SECRET = "dev-only-better-auth-secret-not-for-production"

export function resolveBetterAuthSecret(
  value: string | undefined | null = optionalEnv("BETTER_AUTH_SECRET"),
) {
  if (!value) {
    throw new Error("missing env BETTER_AUTH_SECRET")
  }
  if (value === INSECURE_BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET must not use the known insecure default")
  }
  return value
}
