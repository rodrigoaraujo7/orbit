/**
 * Self-check of the invoice filter (see invoice-table.ts). Sorting became
 * generic and has its own check in table-sort.check.ts.
 * Run with: pnpm check:invoice-table
 */
import { effectiveMonth, filterInvoices } from "./invoice-table.ts"
import type { Invoice } from "@/data/projects"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`expected ${e}, got ${a}`)
  },
}

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

// effective month: uses referenceMonth when present
assert.deepEqual(effectiveMonth(invoice({ referenceMonth: "2026-03" })), "2026-03")
// upfront deal: with no referenceMonth, falls back to the generatedAt month
assert.deepEqual(effectiveMonth(invoice({ generatedAt: "2026-01-05" })), "2026-01")

const jan = invoice({ id: "jan", referenceMonth: "2026-01", status: "paid" })
const feb = invoice({ id: "feb", referenceMonth: "2026-02", status: "pending" })
const mar = invoice({ id: "mar", referenceMonth: "2026-03", status: "overdue" })
const list = [jan, feb, mar]

// status filter
assert.deepEqual(
  filterInvoices(list, { status: "pending", monthFrom: "", monthTo: "" }).map((i) => i.id),
  ["feb"]
)
assert.deepEqual(
  filterInvoices(list, { status: "all", monthFrom: "", monthTo: "" }).map((i) => i.id),
  ["jan", "feb", "mar"]
)

// month filter (range)
assert.deepEqual(
  filterInvoices(list, { status: "all", monthFrom: "2026-02", monthTo: "2026-03" }).map(
    (i) => i.id
  ),
  ["feb", "mar"]
)

console.log("invoice-table: all checks passed")
