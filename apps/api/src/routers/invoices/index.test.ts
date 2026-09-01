import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { invoice } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import { caller, closeTestDb, insertUser, openTestDb, requiredContactFields } from "../../test/harness.ts"

let db: Awaited<ReturnType<typeof openTestDb>>["db"]
let client: Awaited<ReturnType<typeof openTestDb>>["client"]

beforeEach(async () => {
  ;({ db, client } = await openTestDb())
  await insertUser(client, "user-a")
})

afterEach(async () => {
  await closeTestDb(client)
})

describe("invoices and payments", () => {
  it("lists generated invoices and records persisted ones", async () => {
    const api = caller("user-a")
    expect(await api.invoices.list({ projectId: "missing" })).toEqual({
      items: [],
      totals: { count: 0, paid: 0, overdue: 0 },
    })

    const contact = await api.contacts.create({ name: "Ada", ...requiredContactFields })
    const created = await api.projects.create({
      name: "Portal",
      clientId: contact.id,
      status: "paused",
      startedAt: "2026-01-10",
      deal: { kind: "installment", amount: 3000, installments: 3, currency: "BRL" },
      tools: [],
      repo: null,
    })
    const listed = await api.invoices.list({ projectId: created.id, status: "all" })
    expect(listed.totals.count).toBe(3)

    const withClient = await api.projects.create({
      name: "Cliented",
      clientId: contact.id,
      status: "in-development",
      startedAt: "2026-01-10",
      deal: { kind: "upfront", amount: 500, currency: "BRL" },
      tools: [],
      repo: null,
    })
    const named = await api.invoices.list({ projectId: withClient.id })
    expect(named.items[0]?.payerName).toBe("Ada")

    const persisted = await api.invoices.create({
      projectId: created.id,
      amount: 99,
      currency: "BRL",
      dueDate: "2026-06-01",
      payerName: "Ada",
      referenceMonth: "2026-06",
    })
    const withoutMonth = await api.invoices.create({
      projectId: created.id,
      amount: 10,
      currency: "BRL",
      dueDate: "2026-07-01",
      payerName: "Ada",
    })
    expect(withoutMonth.id).toBeTruthy()
    await withUser(db, "user-a", async (tx) => {
      await tx.insert(invoice).values({
        id: "inv-status",
        userId: "user-a",
        projectId: created.id,
        amountCents: 1000n,
        currency: "BRL",
        status: "pending",
        dueDate: "2026-06-01",
        payerName: "Ada",
      })
      await tx.insert(invoice).values({
        id: "inv-empty-payer",
        userId: "user-a",
        projectId: created.id,
        amountCents: 500n,
        currency: "BRL",
        status: "pending",
        dueDate: "2026-06-02",
        payerName: "",
      })
    })
    await api.invoices.setStatus({ id: "inv-status", status: "pending" })
    await api.invoices.setStatus({ id: "inv-status", status: "paid", paymentMethod: "pix" })
    await api.invoices.setStatus({ id: "inv-empty-payer", status: "overdue" })
    await api.invoices.setStatus({ id: "missing", status: "paid" })

    await api.payments.create({ invoiceId: persisted.id, amount: 99, method: "boleto" })
  })
})
