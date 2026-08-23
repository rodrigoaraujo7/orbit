import { serve } from "@hono/node-server"
import { app } from "./app.ts"
import { applySchema, createDb } from "./db/client.ts"
import { optionalEnv } from "./env.ts"
import { mountApi } from "./mount.ts"

if (optionalEnv("DATABASE_URL")) {
  const { client } = createDb()
  await applySchema(client)
  mountApi(app)
}

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on ${info.port}`)
})
