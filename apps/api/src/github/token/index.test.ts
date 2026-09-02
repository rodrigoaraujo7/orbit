import { randomBytes } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { githubToken } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import { closeTestDb, insertUser, openTestDb } from "../../test/harness.ts"
import {
  deleteGithubToken,
  readGithubToken,
  readGithubTokenByHook,
  saveGithubToken,
} from "./index.ts"

const master = randomBytes(32).toString("hex")

let db: Awaited<ReturnType<typeof openTestDb>>["db"]
let client: Awaited<ReturnType<typeof openTestDb>>["client"]

beforeEach(async () => {
  process.env.MASTER_KEY = master
  ;({ db, client } = await openTestDb())
  await insertUser(client, "user-a")
  await insertUser(client, "user-b")
})

afterEach(async () => {
  await closeTestDb(client)
})

describe("github token storage", () => {
  it("seals the token and reads it back", async () => {
    const saved = await withUser(db, "user-a", (tx) =>
      saveGithubToken(tx, "user-a", "ghp_secret", "ada"),
    )
    expect(saved.hookId).toBeTruthy()
    expect(saved.hookSecret).toHaveLength(48)

    const [row] = await db.select().from(githubToken)
    expect(row.ciphertext).not.toContain("ghp_secret")

    const stored = await withUser(db, "user-a", (tx) => readGithubToken(tx, "user-a"))
    expect(stored).toMatchObject({
      userId: "user-a",
      token: "ghp_secret",
      login: "ada",
      hookId: saved.hookId,
    })
  })

  it("returns null when the user never connected", async () => {
    expect(await withUser(db, "user-a", (tx) => readGithubToken(tx, "user-a"))).toBeNull()
    expect(await readGithubTokenByHook(db, "nope")).toBeNull()
  })

  it("keeps the hook credentials when the token is rotated", async () => {
    const first = await withUser(db, "user-a", (tx) =>
      saveGithubToken(tx, "user-a", "ghp_one", "ada"),
    )
    const second = await withUser(db, "user-a", (tx) =>
      saveGithubToken(tx, "user-a", "ghp_two", null),
    )
    expect(second).toEqual(first)

    const stored = await withUser(db, "user-a", (tx) => readGithubToken(tx, "user-a"))
    expect(stored).toMatchObject({ token: "ghp_two", login: null })
  })

  it("resolves a delivery by its hook id without a session", async () => {
    const { hookId, hookSecret } = await withUser(db, "user-a", (tx) =>
      saveGithubToken(tx, "user-a", "ghp_secret", "ada"),
    )
    expect(await readGithubTokenByHook(db, hookId)).toMatchObject({
      userId: "user-a",
      token: "ghp_secret",
      hookSecret,
    })
  })

  it("isolates one user from another", async () => {
    await withUser(db, "user-a", (tx) => saveGithubToken(tx, "user-a", "ghp_a", "ada"))
    expect(await withUser(db, "user-b", (tx) => readGithubToken(tx, "user-a"))).toBeNull()
  })

  it("drops the row on disconnect", async () => {
    await withUser(db, "user-a", (tx) => saveGithubToken(tx, "user-a", "ghp_a", "ada"))
    await withUser(db, "user-a", (tx) => deleteGithubToken(tx, "user-a"))
    expect(await withUser(db, "user-a", (tx) => readGithubToken(tx, "user-a"))).toBeNull()
  })
})
