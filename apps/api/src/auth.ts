import { dash } from "@better-auth/infra"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import { getDb } from "./db/client.ts"
import { schema } from "./db/schema.ts"
import { env, optionalEnv } from "./env.ts"

const webOrigin = optionalEnv("WEB_ORIGIN") ?? "http://localhost:5173"

export function createAuth() {
  const secret =
    optionalEnv("BETTER_AUTH_SECRET") ??
    (process.env.NODE_ENV === "production"
      ? env("BETTER_AUTH_SECRET")
      : "dev-only-better-auth-secret-not-for-production")

  return betterAuth({
    baseURL: optionalEnv("BETTER_AUTH_URL") ?? webOrigin,
    secret,
    trustedOrigins: [webOrigin, "https://dash.better-auth.com", "https://*.ngrok-free.app"],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: { enabled: true },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    plugins: [twoFactor({ issuer: "Projects Manager" }), dash()],
  })
}

export type Auth = ReturnType<typeof createAuth>

let singleton: Auth | undefined

export function getAuth() {
  singleton ??= createAuth()
  return singleton
}
