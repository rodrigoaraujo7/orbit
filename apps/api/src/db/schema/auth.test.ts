import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { schema } from "./schema.ts"
import { closeTestDb, openTestDb } from "../test/harness.ts"

const schemaSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8")

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

describe("auth schema", () => {
  afterEach(async () => {
    // opened dbs are closed in each test
  })

  it("backfills issuer on existing credential accounts", async () => {
    const upgrade = new PGlite()
    await upgrade.exec(oldAccountSql)
    await upgrade.exec(schemaSql)
    const backfilled = await upgrade.query<{ issuer: string; account_id: string }>(
      `select issuer, account_id from account where id = 'acc-1'`,
    )
    expect(backfilled.rows[0]?.issuer).toBe("local:credential")
    expect(backfilled.rows[0]?.account_id).toBe("user-1")
    await upgrade.close()
  })

  it("lets Better Auth sign up and sign in against the live schema", async () => {
    const { db, client } = await openTestDb()
    const auth = betterAuth({
      baseURL: "http://localhost:5173",
      secret: "test-only-better-auth-secret-32chars",
      database: drizzleAdapter(db, { provider: "pg", schema }),
      emailAndPassword: { enabled: true },
    })

    const signedUp = await auth.api.signUpEmail({
      body: { email: "new@test.local", password: "password1234", name: "New" },
    })
    expect(typeof signedUp.user.id).toBe("string")

    const signedIn = await auth.api.signInEmail({
      body: { email: "new@test.local", password: "password1234" },
    })
    expect(signedIn.user.email).toBe("new@test.local")
    await closeTestDb(client)
  })
})
