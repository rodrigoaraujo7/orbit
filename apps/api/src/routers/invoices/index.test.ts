import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { invoice, project } from "../../db/schema/index.ts"
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

describe("invoices and payments", () => {
  it("lists generated invoices and records persisted ones", async () => {
    const api = caller("user-a")
    expect(await api.invoices.list({ projectId: "missing" })).toEqual({
      items: [],
      totals: { count: 0, paid: 0, overdue: 0 },
    })

    await withUser(db, "user-a", async (tx) => {
      await tx.insert(project).values({
        id: "p-anon",
        userId: "user-a",
        name: "Anonymous",
        status: "paused",
        position: 0,
        startedAt: "2026-01-10",
        dealKind: "installment",
        dealAmountCents: 300000n,
        dealCurrency: "BRL",
        dealInstallments: 3,
      })
    })
    expect((await api.invoices.list({ projectId: "p-anon", status: "all" })).totals.count).toBe(3)

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
    await expect(api.invoices.setStatus({ id: "missing", status: "paid" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    await api.payments.create({ invoiceId: persisted.id, amount: 99, method: "boleto" })
  })

  it("changes the status of a generated invoice and keeps it across reads", async () => {
    const api = caller("user-a")
    const contact = await api.contacts.create({ name: "Ada", ...requiredContactFields })
    const created = await api.projects.create({
      name: "Future",
      clientId: contact.id,
      status: "in-development",
      startedAt: "2099-01-10",
      deal: { kind: "installment", amount: 2000, installments: 2, currency: "BRL" },
      tools: [],
      repo: null,
    })
    const first = `${created.id}-invoice-1`
    const statusOf = async (id: string) =>
      (await api.invoices.list({ projectId: created.id })).items.find((row) => row.id === id)

    expect((await statusOf(first))?.status).toBe("pending")

    await api.invoices.setStatus({ id: first, status: "paid", paymentMethod: "pix" })
    const paid = await statusOf(first)
    expect(paid).toMatchObject({ status: "paid", paymentMethod: "pix", payerName: "Ada" })
    expect(paid?.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect((await statusOf(`${created.id}-invoice-2`))?.status).toBe("pending")

    await api.invoices.setStatus({ id: first, status: "paid" })
    expect(await statusOf(first)).toMatchObject({ paymentMethod: "pix", paidAt: paid?.paidAt })

    await api.invoices.setStatus({ id: first, status: "overdue" })
    const overdue = await statusOf(first)
    expect(overdue).toMatchObject({ status: "overdue" })
    expect(overdue?.paymentMethod).toBeUndefined()
    expect(overdue?.paidAt).toBeUndefined()

    const metrics = await api.dashboard.metrics({ currency: "BRL" })
    expect(metrics.summary.atrasado).toBe(1000)

    const history = await api.audit.list({ projectId: created.id, limit: 50 })
    expect(history.items.filter((row) => row.action === "financial.invoice.status")).toHaveLength(2)

    await expect(
      api.invoices.setStatus({ id: `${created.id}-invoice-9`, status: "paid" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("keeps the generated payment method when a paid invoice without a client is saved", async () => {
    const api = caller("user-a")
    await withUser(db, "user-a", async (tx) => {
      await tx.insert(project).values({
        id: "p-past",
        userId: "user-a",
        name: "Past",
        status: "in-development",
        position: 0,
        startedAt: "2020-01-10",
        dealKind: "upfront",
        dealAmountCents: 100000n,
        dealCurrency: "BRL",
      })
    })
    await api.invoices.setStatus({ id: "p-past-invoice-1", status: "paid" })
    const [row] = (await api.invoices.list({ projectId: "p-past" })).items
    expect(row).toMatchObject({ status: "paid", paymentMethod: "boleto", payerName: "" })
    expect(row?.paidAt).toBeTruthy()
  })
})
