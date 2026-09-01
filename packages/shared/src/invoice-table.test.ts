import { describe, expect, it } from "vitest"
import { effectiveMonth, filterInvoices } from "./invoice-table.ts"
import type { Invoice } from "./project.ts"

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    amount: 100,
    status: "pending",
    generatedAt: "2026-01-05",
    payerName: "Client",
    hasAttachment: false,
    currency: "BRL",
    ...overrides,
  }
}

describe("effectiveMonth", () => {
  it("prefers referenceMonth and falls back to generatedAt", () => {
    expect(effectiveMonth(invoice({ referenceMonth: "2026-03" }))).toBe("2026-03")
    expect(effectiveMonth(invoice({ generatedAt: "2026-01-05" }))).toBe("2026-01")
  })
})

describe("filterInvoices", () => {
  const jan = invoice({ id: "jan", referenceMonth: "2026-01", status: "paid" })
  const feb = invoice({ id: "feb", referenceMonth: "2026-02", status: "pending" })
  const mar = invoice({ id: "mar", referenceMonth: "2026-03", status: "overdue" })
  const list = [jan, feb, mar]

  it("filters by status and month bounds", () => {
    expect(
      filterInvoices(list, { status: "pending", monthFrom: "", monthTo: "" }).map((i) => i.id),
    ).toEqual(["feb"])
    expect(
      filterInvoices(list, { status: "all", monthFrom: "", monthTo: "" }).map((i) => i.id),
    ).toEqual(["jan", "feb", "mar"])
    expect(
      filterInvoices(list, { status: "all", monthFrom: "2026-02", monthTo: "2026-03" }).map(
        (i) => i.id,
      ),
    ).toEqual(["feb", "mar"])
  })

  it("applies a lower or upper bound alone", () => {
    expect(
      filterInvoices(list, { status: "all", monthFrom: "2026-03", monthTo: "" }).map((i) => i.id),
    ).toEqual(["mar"])
    expect(
      filterInvoices(list, { status: "all", monthFrom: "", monthTo: "2026-01" }).map((i) => i.id),
    ).toEqual(["jan"])
  })
})
