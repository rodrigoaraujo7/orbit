import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { schema } from "../schema/index.ts"

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "../schema/schema.sql")
const schemaSql = readFileSync(sqlPath, "utf8")

export async function createTestDb() {
  const client = new PGlite()
  await client.exec(schemaSql)
  const db = drizzle({ client, schema })
  return { client, db }
}

export async function insertUser(client: PGlite, id: string, email = `${id}@test.local`) {
  await client.query(
    `insert into "user" (id, name, email, email_verified) values ($1, $2, $3, true)`,
    [id, id, email],
  )
}
