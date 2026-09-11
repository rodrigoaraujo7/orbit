import { optionalEnv } from "../../env/index.ts"

export function resolveBetterAuthApiKey(
  value: string | undefined | null = optionalEnv("BETTER_AUTH_API_KEY"),
) {
  const key = value?.trim() ?? ""
  return key || undefined
}
