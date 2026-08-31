import { trpcServer } from "@hono/trpc-server"
import type { Hono } from "hono"
import { getAuth } from "./auth.ts"
import { createContext } from "./trpc/init.ts"
import { appRouter } from "./trpc/router.ts"

export function mountApi(app: Hono) {
  app.on(["POST", "GET"], "/api/auth/*", (c) => getAuth().handler(c.req.raw))
  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext,
    }),
  )
}
