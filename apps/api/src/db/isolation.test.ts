import { eq, sql } from "drizzle-orm"
import { afterEach, describe, expect, it } from "vitest"
import { contact, customTool, invoice, project, projectTool } from "./schema.ts"
import { closeTestDb, insertUser, openTestDb } from "../test/harness.ts"
import { withUser } from "./with-user.ts"

let client: Awaited<ReturnType<typeof openTestDb>>["client"]
let db: Awaited<ReturnType<typeof openTestDb>>["db"]

afterEach(async () => {
  if (client) await closeTestDb(client)
})

describe("tenant isolation", () => {
  it("keeps user B from reading or writing user A's rows", async () => {
    ;({ db, client } = await openTestDb())
    await insertUser(client, "user-a")
    await insertUser(client, "user-b")

    await withUser(db, "user-a", async (tx) => {
      await tx.insert(contact).values({
        id: "c-a",
        userId: "user-a",
        name: "Alice Contact",
      })
    })

    const asB = await withUser(db, "user-b", async (tx) => tx.select().from(contact))
    expect(asB).toHaveLength(0)

    const stolen = await withUser(db, "user-b", async (tx) =>
      tx.select().from(contact).where(eq(contact.id, "c-a")),
    )
    expect(stolen).toHaveLength(0)

    const raw = await withUser(db, "user-b", async (tx) =>
      tx.execute(sql`select id from contact where user_id = 'user-a'`),
    )
    expect((raw as { rows?: unknown[] }).rows?.length ?? (raw as unknown[]).length).toBe(0)

    await expect(
      withUser(db, "user-b", async (tx) => {
        await tx.insert(contact).values({
          id: "c-fake",
          userId: "user-a",
          name: "Forged",
        })
      }),
    ).rejects.toThrow()

    const asA = await withUser(db, "user-a", async (tx) => tx.select().from(contact))
    expect(asA).toHaveLength(1)
    expect(asA[0]?.name).toBe("Alice Contact")

    await client.query(
      `insert into two_factor (id, secret, backup_codes, user_id) values ('tf-a', 'totp-secret', '[]', 'user-a')`,
    )
    await expect(
      withUser(db, "user-b", async (tx) => tx.execute(sql`select secret from two_factor`)),
    ).rejects.toThrow()

    await withUser(db, "user-a", async (tx) => {
      await tx.insert(project).values({
        id: "p-a",
        userId: "user-a",
        name: "Alice Project",
        status: "queued",
        position: 0,
        startedAt: "2026-01-01",
        dealKind: "upfront",
        dealAmountCents: 0n,
        dealCurrency: "BRL",
      })
    })

    await expect(
      withUser(db, "user-b", async (tx) => {
        await tx.insert(invoice).values({
          id: "inv-steal",
          userId: "user-b",
          projectId: "p-a",
          amountCents: 100n,
          currency: "BRL",
          status: "pending",
          dueDate: "2026-02-01",
        })
      }),
    ).rejects.toThrow()

    await expect(
      withUser(db, "user-b", async (tx) => {
        await tx.insert(projectTool).values({
          id: "tool-steal",
          userId: "user-b",
          projectId: "p-a",
          catalogId: "aws",
          name: "AWS",
          category: "infra",
        })
      }),
    ).rejects.toThrow()

    await withUser(db, "user-a", async (tx) => {
      await tx.insert(project).values({
        id: "p-with-contact",
        userId: "user-a",
        contactId: "c-a",
        name: "With contact",
        status: "queued",
        position: 1,
        startedAt: "2026-01-01",
        dealKind: "upfront",
        dealAmountCents: 0n,
        dealCurrency: "BRL",
      })
    })

    await expect(
      withUser(db, "user-a", async (tx) => {
        await tx.insert(project).values({
          id: "p-bad-contact",
          userId: "user-a",
          contactId: "does-not-exist",
          name: "Bad contact",
          status: "queued",
          position: 2,
          startedAt: "2026-01-01",
          dealKind: "upfront",
          dealAmountCents: 0n,
          dealCurrency: "BRL",
        })
      }),
    ).rejects.toThrow()

    await withUser(db, "user-a", async (tx) => {
      await tx.update(contact).set({ name: "Alice Renamed" }).where(eq(contact.id, "c-a"))
      await tx.insert(customTool).values({
        id: "tool-a",
        userId: "user-a",
        name: "Acme Tool",
        category: "infra",
      })
    })

    const updatedAsB = await withUser(db, "user-b", async (tx) => {
      await tx.update(contact).set({ name: "Stolen" }).where(eq(contact.id, "c-a"))
      await tx.update(customTool).set({ name: "Stolen Tool" }).where(eq(customTool.id, "tool-a"))
      return {
        contacts: await tx.select().from(contact),
        tools: await tx.select().from(customTool),
      }
    })
    expect(updatedAsB.contacts).toHaveLength(0)
    expect(updatedAsB.tools).toHaveLength(0)

    const stillA = await withUser(db, "user-a", async (tx) => ({
      contact: (await tx.select().from(contact).where(eq(contact.id, "c-a")))[0],
      tool: (await tx.select().from(customTool).where(eq(customTool.id, "tool-a")))[0],
    }))
    expect(stillA.contact?.name).toBe("Alice Renamed")
    expect(stillA.tool?.name).toBe("Acme Tool")
  })
})
