import { afterEach, describe, expect, it } from "vitest"
import { auditLog } from "../db/schema.ts"
import { recordAudit } from "./record.ts"
import { closeTestDb, insertUser, openTestDb } from "../test/harness.ts"
import { withUser } from "../db/with-user.ts"

describe("recordAudit", () => {
  afterEach(async () => {
    // closed per test
  })

  it("inserts a row with optional fields defaulted", async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, "user-a")
    await withUser(db, "user-a", async (tx) => {
      await recordAudit(
        tx,
        { userId: "user-a" },
        { module: "project", action: "project.create" },
      )
      await recordAudit(
        tx,
        { userId: "user-a", ip: "1.1.1.1", userAgent: "vitest" },
        {
          module: "kanban",
          action: "kanban.move",
          subjectId: "p1",
          subjectLabel: "Portal",
          projectId: "p1",
          changes: [{ field: "status", from: "queued", to: "paused" }],
        },
      )
    })
    const rows = await withUser(db, "user-a", (tx) => tx.select().from(auditLog))
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.action === "project.create")?.changes).toEqual([])
    expect(rows.find((row) => row.action === "kanban.move")?.ip).toBe("1.1.1.1")
    await closeTestDb(client)
  })
})
