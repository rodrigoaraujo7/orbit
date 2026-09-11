import { optionalEnv } from "../../env/index.ts"

export const MISSING_DATABASE_URL = "missing env DATABASE_URL"

export function resolveDatabaseUrlSecret(
  value: string | undefined | null = optionalEnv("DATABASE_URL"),
) {
  const secret = value?.trim() ?? ""
  if (!secret) {
    throw new Error(MISSING_DATABASE_URL)
  }
  return secret
}
