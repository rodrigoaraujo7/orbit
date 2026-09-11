import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { schema, user } from "./index.ts"
import { closeTestDb, openTestDb } from "../../test/harness.ts"

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
  values ('user-1', 'Ada', 'ada@test.local', true),
         ('user-2', 'Grace', 'grace@test.local', false);
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

  it("grandfathers existing users into email 2FA exactly once", async () => {
    const upgrade = new PGlite()
    await upgrade.exec(oldAccountSql)
    await upgrade.exec(schemaSql)

    type Row = { id: string; locale: string; email_verified: boolean; two_factor_enabled: boolean }
    const select = `select id, locale, email_verified, two_factor_enabled from "user" order by id`
    const migrated = await upgrade.query<Row>(select)
    expect(migrated.rows).toEqual([
      { id: "user-1", locale: "en-US", email_verified: true, two_factor_enabled: true },
      { id: "user-2", locale: "en-US", email_verified: true, two_factor_enabled: true },
    ])

    // A second boot must not re-verify an account created after the migration.
    await upgrade.query(
      `insert into "user" (id, name, email, email_verified, two_factor_enabled, locale)
         values ('user-3', 'Alan', 'alan@test.local', false, false, 'pt-BR')`,
    )
    await upgrade.exec(schemaSql)
    const rebooted = await upgrade.query<Row>(select)
    expect(rebooted.rows[2]).toEqual({
      id: "user-3",
      locale: "pt-BR",
      email_verified: false,
      two_factor_enabled: false,
    })
    await upgrade.close()
  })

  it("creates a fresh database already carrying the locale default", async () => {
    const { db, client } = await openTestDb()
    await client.query(
      `insert into "user" (id, name, email) values ('user-fresh', 'Fresh', 'fresh@test.local')`,
    )
    const [row] = await db.select({ locale: user.locale }).from(user)
    expect(row.locale).toBe("en-US")
    await closeTestDb(client)
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
