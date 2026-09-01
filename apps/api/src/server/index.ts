import { serve } from '@hono/node-server'
import { app } from '../app/index.ts'
import { applySchema, createDb } from '../db/client/index.ts'
import { optionalEnv } from '../env/index.ts'
import { mountApi } from '../mount/index.ts'

export async function start(options?: { port?: number }) {
  if (!optionalEnv('DATABASE_URL')) {
    throw new Error('missing env DATABASE_URL')
  }
  if (!optionalEnv('BETTER_AUTH_API_KEY')) {
    console.warn('missing BETTER_AUTH_API_KEY; Better Auth dashboard cannot validate this server')
  }

  const { client } = createDb()
  await applySchema(client)
  mountApi(app)

  const port = options?.port ?? Number(process.env.PORT ?? 3000)

  return serve({ fetch: app.fetch, port }, (info) => {
    console.log(`api listening on ${info.port}`)
  })
}
