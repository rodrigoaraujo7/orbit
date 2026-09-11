import { serve } from "@hono/node-server"
import { app } from "../app/index.ts"
import { resolveBetterAuthApiKey } from "../auth/api-key/index.ts"
import { resolveBetterAuthSecret } from "../auth/secret/index.ts"
import { applySchema, createDb } from "../db/client/index.ts"
import { resolveDatabaseUrlSecret } from "../db/url/index.ts"
import { mountApi } from "../mount/index.ts"

export async function start(options?: { port?: number }) {
  resolveDatabaseUrlSecret()
  resolveBetterAuthSecret()
  if (!resolveBetterAuthApiKey()) {
    console.warn("missing BETTER_AUTH_API_KEY; Better Auth dashboard cannot validate this server")
  }

  const { client } = createDb()
  await applySchema(client)
  mountApi(app)

  const port = options?.port ?? Number(process.env.PORT ?? 3000)

  return serve({ fetch: app.fetch, port }, (info) => {
    console.log(`api listening on ${info.port}`)
  })
}
