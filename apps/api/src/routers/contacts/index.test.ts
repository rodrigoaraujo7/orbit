import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { contact } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import {
  caller,
  closeTestDb,
  insertUser,
  openTestDb,
  requiredContactFields,
} from "../../test/harness.ts"

let db: Awaited<ReturnType<typeof openTestDb>>["db"]
let client: Awaited<ReturnType<typeof openTestDb>>["client"]

beforeEach(async () => {
  ;({ db, client } = await openTestDb())
  await insertUser(client, "user-a")
})

afterEach(async () => {
  await closeTestDb(client)
})

describe("contacts router", () => {
  it("creates, lists, updates and deletes contacts", async () => {
    const api = caller("user-a")
    const created = await api.contacts.create({
      name: "Ada",
      email: "ada@test.local",
      ...requiredContactFields,
    })
    expect(created.name).toBe("Ada")
    expect((await api.contacts.list())[0]?.id).toBe(created.id)

    await api.contacts.update({
      id: created.id,
      name: "Ada Lovelace",
      email: "",
      phone: "1199",
      company: "Acme",
    })
    expect((await api.contacts.list())[0]).toMatchObject({ name: "Ada Lovelace", email: null })

    await api.contacts.update({
      id: created.id,
      name: "Ada Lovelace",
      email: "",
      phone: "1199",
      company: "Acme",
    })
    await api.contacts.update({
      id: "missing",
      name: "Ghost",
      ...requiredContactFields,
    })
    await withUser(db, "user-a", async (tx) => {
      await tx.insert(contact).values({ id: "c-sparse", userId: "user-a", name: "Sparse" })
    })
    await api.contacts.update({
      id: "c-sparse",
      name: "Sparse",
      ...requiredContactFields,
    })
    await api.contacts.delete({ id: created.id })
    await api.contacts.delete({ id: "c-sparse" })
    expect(await api.contacts.list()).toEqual([])
    await api.contacts.delete({ id: created.id })
  })

  it("rejects incomplete create payloads", async () => {
    const api = caller("user-a")
    await expect(api.contacts.create({ name: "Ada" } as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    await expect(
      api.contacts.create({ name: "Ada", phone: "", company: "Acme" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    await expect(api.contacts.delete({ id: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
