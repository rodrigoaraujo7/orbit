import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema.ts'
import { env } from '../env.ts'
import { postgresClientOptions } from './postgres-options.ts'

const schemaSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8')

export function createDb(url = env('DATABASE_URL')) {
  const client = postgres(url, postgresClientOptions(url))
  const db = drizzle({ client, schema })
  return { client, db }
}

export async function applySchema(client: postgres.Sql) {
  await client.unsafe(schemaSql)
}

let singleton: ReturnType<typeof createDb> | undefined

export function getDb() {
  singleton ??= createDb()
  return singleton.db
}

export function resetDb() {
  singleton = undefined
}
