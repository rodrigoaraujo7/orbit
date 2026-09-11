import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { schema } from "../schema/index.ts"
import { resolveDatabaseUrlSecret } from "../url/index.ts"
import { postgresClientOptions } from "../postgres-options.ts"

const schemaSql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../schema/schema.sql"),
  "utf8",
)

export function createDb(url = resolveDatabaseUrlSecret()) {
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
