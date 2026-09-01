import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { contact, credential, project, projectTool, userKey } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import { openSecret, parseMasterKey, secretAad, unwrapDek } from "../../crypto/envelope/index.ts"
import { caller, closeTestDb, insertUser, openTestDb } from "../../test/harness.ts"
import { listProjects, replaceProjectTools } from "./index.ts"
import { sealNewSecret } from "../credentials/index.ts"

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

const baseProject = {
  name: "Landing",
  clientId: "c1",
  status: "queued" as const,
  startedAt: "2026-03-10",
  deal: { kind: "upfront" as const, amount: 0 },
  tools: [] as never[],
  repo: null,
}

describe("projects router", () => {
  it("filters the list in SQL and keeps tenants apart", async () => {
    await withUser(db, "user-a", async (tx) => {
      await tx.insert(contact).values([
        { id: "c1", userId: "user-a", name: "Acme Ltda" },
        { id: "c2", userId: "user-a", name: "Other Co" },
      ])
      await tx.insert(project).values([
        {
          id: "p1",
          userId: "user-a",
          name: "Landing",
          status: "in-development",
          position: 0,
          contactId: "c1",
          startedAt: "2026-03-10",
          dealKind: "upfront",
          dealAmountCents: 0n,
          dealCurrency: "BRL",
          repoFullName: "org/landing",
          repoUrl: "https://github.com/org/landing",
          repoWorkflow: "success",
        },
        {
          id: "p2",
          userId: "user-a",
          name: "Portal",
          status: "queued",
          position: 1,
          contactId: "c2",
          startedAt: "2026-01-15",
          dealKind: "upfront",
          dealAmountCents: 0n,
          dealCurrency: "BRL",
          repoFullName: "org/portal",
          repoUrl: "https://github.com/org/portal",
          repoWorkflow: "failure",
        },
      ])
    })
    await withUser(db, "user-b", async (tx) => {
      await tx.insert(contact).values({ id: "cb", userId: "user-b", name: "Acme Secret" })
      await tx.insert(project).values({
        id: "pb",
        userId: "user-b",
        name: "Secret",
        status: "in-development",
        position: 0,
        contactId: "cb",
        startedAt: "2026-03-10",
        dealKind: "upfront",
        dealAmountCents: 0n,
        dealCurrency: "BRL",
      })
    })

    const api = caller("user-a")
    expect((await api.projects.list()).map((row) => row.id).sort()).toEqual(["p1", "p2"])
    expect((await api.projects.list({ q: "acme" }))[0]?.name).toBe("Landing")
    expect((await api.projects.list({ q: "portal" }))[0]?.name).toBe("Portal")
    expect((await api.projects.list({ q: "100\\%_off" }))).toEqual([])
    expect((await api.projects.list({ status: "queued" }))[0]?.id).toBe("p2")
    expect((await api.projects.list({ workflow: "success" }))[0]?.id).toBe("p1")
    expect((await api.projects.list({ clientId: "c1" }))[0]?.id).toBe("p1")
    expect((await api.projects.list({ monthFrom: "2026-03", monthTo: "2026-03" }))[0]?.id).toBe("p1")
    expect(await api.projects.list({ q: "secret" })).toEqual([])
    await expect(caller(null).projects.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("creates, updates, moves and deletes a project with tools and secrets", async () => {
    const api = caller("user-a")
    await api.contacts.create({ name: "Acme Ltda" }).catch(() => undefined)
    const contactRow = (await api.contacts.create({ name: "Ada Lovelace", email: "ada@test.local" })) as {
      id: string
    }

    const created = await api.projects.create({
      ...baseProject,
      clientId: contactRow.id,
      description: "first",
      deal: { kind: "installment", amount: 18000, installments: 3, currency: "USD" },
      repo: { fullName: "org/app", url: "https://github.com/org/app", workflow: "none" },
      tools: [
        {
          id: "aws",
          name: "AWS",
          category: "deploy",
          account: "ada",
          billing: {
            amount: 20,
            cycle: "monthly",
            nextInvoice: "2026-04-01",
            payer: "me",
            currency: "USD",
          },
          secrets: [{ key: "TOKEN", value: "sk_live" }],
        },
        {
          id: "free",
          name: "Free",
          category: "other",
          secrets: [{ key: "empty", value: "" }],
        },
      ],
    })
    const listed = await api.projects.list()
    const row = listed.find((item) => item.id === created.id)
    expect(row?.repo?.fullName).toBe("org/app")
    expect(row?.deal.currency).toBe("USD")
    expect(row?.tools.some((tool) => tool.billing?.amount === 20)).toBe(true)
    expect(row?.tools.find((tool) => tool.id === "aws")?.secrets).toEqual([{ key: "TOKEN", value: "" }])

    await api.projects.update({
      id: created.id,
      ...baseProject,
      clientId: "",
      name: "Landing 2",
      status: "in-development",
      endedAt: "2026-04-01",
      description: "updated",
      comments: [{ id: "c1", body: "hi" }],
      tools: [
        {
          id: "aws",
          name: "AWS",
          category: "deploy",
          secrets: [{ key: "TOKEN", value: "rotated" }],
          billing: {
            amount: 15,
            cycle: "monthly",
            nextInvoice: "2026-05-01",
            payer: "me",
          },
        },
      ],
    })
    const after = (await api.projects.list())[0]
    expect(after?.name).toBe("Landing 2")
    expect(after?.endedAt).toBeTruthy()
    expect(after?.clientId).toBe("")

    await api.projects.move({ id: created.id, status: "paused", index: 0 })
    await api.projects.move({ id: created.id, status: "paused", index: 1 })
    expect((await api.projects.list())[0]?.status).toBe("paused")

    await api.projects.delete({ id: created.id })
    expect(await api.projects.list()).toEqual([])
    await api.projects.delete({ id: created.id })
    await api.projects.update({
      id: "missing",
      ...baseProject,
      clientId: "",
    })
    await api.projects.move({ id: "missing", status: "queued", index: 0 })
  })

  it("creates with an explicit id and updates omitted optional fields", async () => {
    const api = caller("user-a")
    const created = await api.projects.create({
      id: "fixed-id",
      name: "Fixed",
      clientId: "",
      status: "queued",
      startedAt: "2026-01-01",
      deal: { kind: "upfront", amount: 0 },
      tools: [],
      repo: null,
    })
    expect(created.id).toBe("fixed-id")

    await api.projects.update({
      id: "fixed-id",
      name: "Fixed 2",
      clientId: "",
      status: "queued",
      startedAt: "2026-01-01",
      deal: { kind: "upfront", amount: 0 },
      tools: [],
      repo: null,
    })
    const listed = await api.projects.list()
    expect(listed.find((item) => item.id === "fixed-id")?.name).toBe("Fixed 2")

    await api.projects.update({
      id: "fixed-id",
      name: "Fixed 3",
      clientId: "",
      status: "queued",
      startedAt: "2026-01-01",
      endedAt: "2026-02-01",
      deal: { kind: "upfront", amount: 0 },
      tools: [],
      repo: { fullName: "a/b", url: "https://github.com/a/b", workflow: "none" },
    })
    await api.projects.update({
      id: "fixed-id",
      name: "Fixed 4",
      clientId: "",
      status: "queued",
      startedAt: "2026-01-01",
      endedAt: "2026-03-01",
      description: "later",
      comments: [],
      deal: { kind: "upfront", amount: 0 },
      tools: [{ id: "aws", name: "AWS", category: "deploy", account: "ada", secrets: [] }],
      repo: { fullName: "a/b", url: "https://github.com/a/b", workflow: "none" },
    })

    await withUser(db, "user-a", async (tx) => {
      await tx.insert(project).values({
        id: "p-repo",
        userId: "user-a",
        name: "Repo",
        status: "queued",
        position: 0,
        startedAt: "2026-01-01",
        dealKind: "upfront",
        dealAmountCents: 0n,
        dealCurrency: "BRL",
        repoFullName: "org/app",
        repoUrl: null,
        repoWorkflow: null,
      })
      await tx.insert(project).values({
        id: "p-diff",
        userId: "user-a",
        name: "Diff",
        status: "queued",
        position: 0,
        startedAt: "2026-01-01",
        dealKind: "upfront",
        dealAmountCents: 0n,
        dealCurrency: "BRL",
      })
      await tx.insert(projectTool).values({
        id: "t-diff",
        userId: "user-a",
        projectId: "p-diff",
        catalogId: "aws",
        name: "AWS",
        category: "deploy",
        amountCents: 1000n,
        cycle: null,
        nextInvoice: null,
        payer: null,
        currency: null,
      })
    })
    const withRepo = (await api.projects.list()).find((item) => item.id === "p-repo")
    expect(withRepo?.repo).toMatchObject({ fullName: "org/app", url: "", workflow: "none" })
    await api.projects.update({
      id: "p-diff",
      name: "Diffed",
      clientId: "",
      status: "queued",
      startedAt: "2026-01-01",
      deal: { kind: "upfront", amount: 0 },
      tools: [{ id: "aws", name: "AWS", category: "deploy", secrets: [] }],
      repo: null,
    })
    expect((await api.projects.list()).some((item) => item.name === "Diffed")).toBe(true)
  })

  it("reinserts ciphertext under the same credential id on empty-value updates", async () => {
    const credId = await withUser(db, "user-a", async (tx) => {
      await tx.insert(project).values({
        id: "p1",
        userId: "user-a",
        name: "Secret project",
        status: "queued",
        position: 0,
        startedAt: "2026-01-01",
        dealKind: "upfront",
        dealAmountCents: 0n,
        dealCurrency: "BRL",
      })
      await tx.insert(projectTool).values({
        id: "t1",
        userId: "user-a",
        projectId: "p1",
        catalogId: "aws",
        name: "AWS",
        category: "infra",
      })
      return sealNewSecret(tx, "user-a", "t1", "api-key", "sk_live_abc")
    })

    await withUser(db, "user-a", (tx) =>
      replaceProjectTools(tx, "user-a", "p1", [
        {
          id: "aws",
          name: "AWS",
          category: "infra",
          secrets: [{ key: "api-key", value: "" }],
        },
      ]),
    )

    const [row] = await withUser(db, "user-a", (tx) => tx.select().from(credential))
    expect(row?.id).toBe(credId)

    const [key] = await withUser(db, "user-a", (tx) =>
      tx.select().from(userKey).where(eq(userKey.userId, "user-a")),
    )
    const dek = unwrapDek(parseMasterKey(master), {
      ciphertext: key!.wrappedDek,
      iv: key!.iv,
      tag: key!.tag,
    })
    expect(
      openSecret(
        dek,
        { ciphertext: row!.ciphertext, iv: row!.iv, tag: row!.tag },
        secretAad("user-a", row!.id, row!.version),
      ),
    ).toBe("sk_live_abc")

    await withUser(db, "user-a", (tx) =>
      replaceProjectTools(tx, "user-a", "p1", [
        { id: "aws", name: "AWS", category: "infra", secrets: [{ key: "other", value: "" }] },
      ]),
    )
    const leftover = await withUser(db, "user-a", (tx) => tx.select().from(credential))
    expect(leftover).toHaveLength(0)

    const mapped = await withUser(db, "user-a", (tx) => listProjects(tx, "user-a"))
    expect(mapped[0]?.tools[0]).toMatchObject({ id: "aws", secrets: [] })
  })
})
