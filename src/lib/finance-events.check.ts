/**
 * Self-check of finance event derivation (see finance-events.ts).
 * Run with: npm run check:finance-events
 */
import type { Project, Tool } from "@/data/projects"
import { financeEvents } from "./finance-events.ts"
import { todayIso } from "./dates.ts"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`expected ${e}, got ${a}`)
  },
}

function tool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    secrets: [],
    ...overrides,
  }
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "Projeto Um",
    clientId: "client-1",
    status: "in-development",
    startedAt: "2026-01-05",
    deal: { kind: "upfront", amount: 0 }, // free by default: no receivables noise
    tools: [],
    repo: null,
    ...overrides,
  }
}

const payerNameFor = () => "Cliente"
const today = todayIso()
const past = "2020-01-01"
const future = "2099-01-01"

// tool with payer "client" never becomes an event
const clientPaid = project({
  tools: [tool({ billing: { amount: 10, cycle: "monthly", nextInvoice: future, payer: "client" } })],
})
assert.deepEqual(financeEvents([clientPaid], payerNameFor), [])

// past nextInvoice -> overdue payable
const overdueTool = project({
  tools: [tool({ billing: { amount: 50, cycle: "monthly", nextInvoice: past, payer: "me" } })],
})
assert.deepEqual(
  financeEvents([overdueTool], payerNameFor).map((e) => [e.type, e.status]),
  [["payable", "overdue"]]
)

// future nextInvoice -> pending payable
const futureTool = project({
  tools: [tool({ billing: { amount: 50, cycle: "monthly", nextInvoice: future, payer: "me" } })],
})
assert.deepEqual(
  financeEvents([futureTool], payerNameFor).map((e) => [e.type, e.status]),
  [["payable", "pending"]]
)

// free deal generates no receivables
assert.deepEqual(
  financeEvents([project({ deal: { kind: "upfront", amount: 0 } })], payerNameFor),
  []
)

// paid deal generates a receivable event, currency inherited from the deal
const paidDeal = project({
  startedAt: past,
  deal: { kind: "upfront", amount: 1000, currency: "USD" },
})
const [receivable] = financeEvents([paidDeal], payerNameFor)
assert.deepEqual(receivable.type, "receivable")
assert.deepEqual(receivable.currency, "USD")

// tool with no billing.currency falls back to BRL
const brlTool = project({
  tools: [tool({ billing: { amount: 20, cycle: "monthly", nextInvoice: future, payer: "me" } })],
})
assert.deepEqual(financeEvents([brlTool], payerNameFor)[0].currency, "BRL")

// events are sorted by date
const sorted = financeEvents(
  [overdueTool, futureTool],
  payerNameFor
)
assert.deepEqual(sorted[0].date < sorted[1].date, true)

console.log(`finance-events: all checks passed (today=${today})`)
