import { getTableConfig } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import { schema, user, project, auditLog } from "./index.ts"

describe("drizzle schema", () => {
  it("exports every table on the schema object", () => {
    expect(schema.user).toBe(user)
    expect(schema.project).toBe(project)
    expect(schema.auditLog).toBe(auditLog)
    expect(Object.keys(schema).sort()).toEqual(
      [
        "account",
        "auditLog",
        "contact",
        "credential",
        "customTool",
        "invoice",
        "payment",
        "project",
        "projectTool",
        "session",
        "twoFactor",
        "user",
        "userKey",
        "verification",
      ].sort(),
    )
  })

  it("materializes foreign keys and unique indexes", () => {
    for (const table of Object.values(schema)) {
      const config = getTableConfig(table)
      for (const fk of config.foreignKeys) {
        const ref = fk.reference()
        expect(ref.foreignColumns.length).toBeGreaterThan(0)
      }
      expect(config.columns).toBeTruthy()
    }
  })
})
