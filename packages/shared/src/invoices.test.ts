import { afterEach, describe, expect, it, vi } from "vitest"
import { generateInvoices } from "./invoices.ts"
import type { Project } from "./project.ts"

afterEach(() => {
  vi.useRealTimers()
})

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Projeto",
    clientId: "c1",
    status: "in-development",
    startedAt: "2026-01-10",
    deal: { kind: "upfront", amount: 1000 },
    tools: [],
    ...overrides,
  }
}

describe("generateInvoices", () => {
  it("returns nothing for a free deal", () => {
    expect(generateInvoices(project({ deal: { kind: "upfront", amount: 0 } }), "Ada")).toEqual([])
  })

  it("emits one paid upfront invoice when the due date is in the past", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    const [invoice] = generateInvoices(project({ deal: { kind: "upfront", amount: 1000 } }), "Ada")
    expect(invoice).toMatchObject({
      id: "p1-invoice-1",
      amount: 1000,
      status: "paid",
      paymentMethod: "boleto",
      generatedAt: "2026-01-10",
      paidAt: "2026-01-10T14:32",
      payerName: "Ada",
      hasAttachment: true,
      currency: "BRL",
    })
    expect(invoice.referenceMonth).toBeUndefined()
  })

  it("uses a default of one installment and keeps future dues pending", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    const invoices = generateInvoices(
      project({ deal: { kind: "installment", amount: 900 } }),
      "Ada",
    )
    expect(invoices).toHaveLength(1)
    expect(invoices[0]?.status).toBe("pending")
    expect(invoices[0]?.referenceMonth).toBe("2026-01")
    expect(invoices[0]?.paymentMethod).toBeUndefined()
    expect(invoices[0]?.hasAttachment).toBe(false)
  })

  it("marks the last past due as overdue on a paused project and alternates paid methods", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    const invoices = generateInvoices(
      project({
        status: "paused",
        deal: { kind: "installment", amount: 3000, installments: 3, currency: "USD" },
      }),
      "Ada",
    )
    expect(invoices.map((row) => row.status)).toEqual(["paid", "paid", "overdue"])
    expect(invoices[0]?.paymentMethod).toBe("boleto")
    expect(invoices[1]?.paymentMethod).toBe("pix")
    expect(invoices[2]?.paymentMethod).toBeUndefined()
    expect(invoices[0]?.currency).toBe("USD")
  })

  it("does not invent an overdue invoice when nothing is past due", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 11, 1))
    const invoices = generateInvoices(
      project({
        status: "paused",
        deal: { kind: "installment", amount: 2000, installments: 2 },
      }),
      "Ada",
    )
    expect(invoices.every((row) => row.status === "pending")).toBe(true)
  })
})
