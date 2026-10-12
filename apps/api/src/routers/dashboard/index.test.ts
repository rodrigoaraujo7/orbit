import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { dashboardFiltersSchema } from "shared"
import { validation } from "../../input/messages.ts"
import {
  caller,
  closeTestDb,
  insertUser,
  openTestDb,
  requiredContactFields,
} from "../../test/harness.ts"

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
    const contact = await api.contacts.create({ name: "Ada", ...requiredContactFields })
    await api.projects.create({
      name: "Portal",
      clientId: contact.id,
      status: "in-development",
      startedAt: "2026-01-10",
      deal: { kind: "upfront", amount: 1000, currency: "BRL" },
      tools: [],
      repo: null,
    })
    const empty = await api.dashboard.metrics()
    expect(empty.currency).toBe("BRL")
    const filtered = await api.dashboard.metrics({ clientId: contact.id, currency: "BRL" })
    expect(filtered.summary.projetos).toBeGreaterThanOrEqual(1)
  })

  it("rejects month bounds that are not YYYY-MM", async () => {
    const rejected = dashboardFiltersSchema.safeParse({ monthFrom: "0" })
    expect(rejected.success).toBe(false)
    if (!rejected.success) expect(rejected.error.issues[0]?.message).toBe(validation.month)

    const api = caller("user-a")
    await expect(api.dashboard.metrics({ monthFrom: "0", monthTo: "zzz" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    await expect(api.dashboard.metrics({ monthTo: "2026-13" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    await expect(
      api.dashboard.metrics({ monthFrom: "2026-01", monthTo: "2026-02" }),
    ).resolves.toMatchObject({ months: ["2026-01", "2026-02"] })
  })
})
