/**
 * Better Auth 1.7 scopes accounts by issuer. Login fails if the Drizzle
 * schema or Postgres table is missing that column.
 * Run: pnpm --filter api check:auth-schema
 */
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { schema } from "./schema.ts"
import { createTestDb } from "./test-db.ts"

const assert = {
  equal(actual: unknown, expected: unknown, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} expected ${String(expected)}, got ${String(actual)}`)
    }
  },
}

const schemaSql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "schema.sql"),
  "utf8",
)

const oldAccountSql = `
create table "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table account (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user"(id) on delete cascade,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into "user" (id, name, email, email_verified)
  values ('user-1', 'Ada', 'ada@test.local', true);
insert into account (id, account_id, provider_id, user_id, password)
  values ('acc-1', 'ada@test.local', 'credential', 'user-1', 'hash');
`

const upgrade = new PGlite()
await upgrade.exec(oldAccountSql)
await upgrade.exec(schemaSql)
const backfilled = await upgrade.query<{ issuer: string; account_id: string }>(
  `select issuer, account_id from account where id = 'acc-1'`,
)
assert.equal(backfilled.rows[0]?.issuer, "local:credential", "credential issuer")
assert.equal(backfilled.rows[0]?.account_id, "user-1", "credential account_id is user id")
await upgrade.close()

const { db, client } = await createTestDb()
const auth = betterAuth({
  baseURL: "http://localhost:5173",
  secret: "test-only-better-auth-secret-32chars",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
})

const signedUp = await auth.api.signUpEmail({
  body: { email: "new@test.local", password: "password1234", name: "New" },
})
assert.equal(typeof signedUp.user.id, "string", "sign-up returns a user")

const signedIn = await auth.api.signInEmail({
  body: { email: "new@test.local", password: "password1234" },
})
assert.equal(signedIn.user.email, "new@test.local", "sign-in finds the credential account")

await client.close()
console.log("schema.auth.check.ts: ok")
