import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { caller, closeTestDb, insertUser, openTestDb } from "../test/harness.ts"

let client: Awaited<ReturnType<typeof openTestDb>>["client"]

beforeEach(async () => {
  ;({ client } = await openTestDb())
  await insertUser(client, "user-a")
})

afterEach(async () => {
  await closeTestDb(client)
})

describe("dashboard router", () => {
  it("builds metrics from the caller's projects", async () => {
    const api = caller("user-a")
    const contact = await api.contacts.create({ name: "Ada" })
    await api.projects.create({
      name: "Portal",
      clientId: contact.id,
      status: "in-development",
      startedAt: "2026-01-10",
      deal: { kind: "upfront", amount: 1000 },
      tools: [],
      repo: null,
    })
    const empty = await api.dashboard.metrics()
    expect(empty.currency).toBe("BRL")
    const filtered = await api.dashboard.metrics({ clientId: contact.id, currency: "BRL" })
    expect(filtered.summary.projetos).toBeGreaterThanOrEqual(1)
  })
})
