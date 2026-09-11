import { serve } from "@hono/node-server"
import { app } from "../app/index.ts"
import { dashKeyStatus } from "../auth/dash/index.ts"
import { resolveBetterAuthSecret } from "../auth/secret/index.ts"
import { resolveTrustedOrigins } from "../auth/trusted-origins/index.ts"
import { applySchema, createDb } from "../db/client/index.ts"
import { resolveDatabaseUrlSecret } from "../db/url/index.ts"
import { resendApiKey } from "../email/config/index.ts"
import { mountApi } from "../mount/index.ts"

export async function start(options?: { port?: number }) {
  resolveDatabaseUrlSecret()
  resolveBetterAuthSecret()
  resendApiKey()
  resolveTrustedOrigins()
  const keyStatus = dashKeyStatus()
  if (keyStatus !== "ok") {
    console.warn(
      `${keyStatus} BETTER_AUTH_API_KEY; Better Auth dashboard routes stay unmounted (needs 32+ chars with 12+ distinct characters)`,
    )
  }

  const { client } = createDb()
  await applySchema(client)
  mountApi(app)

  const port = options?.port ?? Number(process.env.PORT ?? 3000)

  return serve({ fetch: app.fetch, port }, (info) => {
    console.log(`api listening on ${info.port}`)
  })
}
