import { trpcServer } from "@hono/trpc-server"
import type { Hono } from "hono"
import { getAuth } from "../auth/index.ts"
import { isBetterAuthSecretError } from "../auth/secret/index.ts"
import { createContext } from "../trpc/init/index.ts"
import { appRouter } from "../trpc/router/index.ts"

export function mountApi(app: Hono) {
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    try {
      return getAuth().handler(c.req.raw)
    } catch (error) {
      if (isBetterAuthSecretError(error)) {
        return c.json({ error: error.message }, 500)
      }
      throw error
    }
  })
  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext,
    }),
  )
}
