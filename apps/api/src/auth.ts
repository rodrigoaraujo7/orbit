import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import { getDb } from "./db/client.ts"
import { schema } from "./db/schema.ts"
import { env, optionalEnv } from "./env.ts"

const webOrigin = optionalEnv("WEB_ORIGIN") ?? "http://localhost:5173"

export function createAuth() {
  return betterAuth({
    baseURL: optionalEnv("BETTER_AUTH_URL") ?? webOrigin,
    secret: env("BETTER_AUTH_SECRET"),
    trustedOrigins: [webOrigin],
    rateLimit: { enabled: true, window: 60, max: 10 },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: { enabled: true },
    session: {
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    plugins: [twoFactor({ issuer: "Projects Manager" })],
  })
}

export type Auth = ReturnType<typeof createAuth>

let singleton: Auth | undefined

export function getAuth() {
  singleton ??= createAuth()
  return singleton
}
