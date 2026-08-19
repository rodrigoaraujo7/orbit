/**
 * Self-check of the dashboard aggregations (see dashboard-metrics.ts).
 * Run with: pnpm check:dashboard
 *
 * Covers what breaks silently: the yearly → monthly normalization, one-off
 * charges landing on exactly one month, a finished project's tools going off
 * the meter, and the revenue over a full range adding back up to the deal.
 */
import type { Project, Tool } from "../data/projects.ts"
import { monthRange } from "./dates.ts"
import {
  clientGrowth,
  financeSummary,
  monthlyToolCost,
  previousMonths,
  profitByProject,
  revenueByMonth,
  toolCostByCategory,
  toolCostByMonth,
  toolCostInMonth,
  toolCostByTool,
} from "./dashboard-metrics.ts"

const assert = {
  equal(actual: unknown, expected: unknown, what: string) {
    if (actual !== expected) {
      throw new Error(`${what}: expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  close(actual: number, expected: number, what: string) {
    if (Math.abs(actual - expected) > 1e-6) {
      throw new Error(`${what}: expected ~${expected}, got ${actual}`)
    }
  },
  deepEqual(actual: unknown, expected: unknown, what: string) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`)
  },
}

function tool(overrides: Partial<Tool> & { billing?: Tool["billing"] }): Tool {
  return {
    id: "aws",
    name: "AWS",
    category: "deploy",
    secrets: [],
    ...overrides,
  }
}

function project(overrides: Partial<Project>): Project {
  return {
    id: "p1",
    name: "Projeto",
    clientId: "c1",
    status: "in-development",
    startedAt: "2026-01-10",
    deal: { kind: "upfront", amount: 0 },
    tools: [],
    repo: null,
    ...overrides,
  }
}

// --- normalization: a yearly plan and a monthly one land on the same scale ---

assert.equal(
  monthlyToolCost(tool({ billing: { amount: 100, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" } })),
  100,
  "mensal fica como está"
)
assert.close(
  monthlyToolCost(tool({ billing: { amount: 1200, cycle: "yearly", nextInvoice: "2026-01-05", payer: "me" } })),
  100,
  "anual vira 1/12"
)
assert.equal(
  monthlyToolCost(tool({ billing: { amount: 500, cycle: "one-off", nextInvoice: "2026-01-05", payer: "me" } })),
  0,
  "avulso não é recorrente"
)

// --- one-off hits exactly one month, and only inside the project's life ---

const oneOff = tool({
  billing: { amount: 500, cycle: "one-off", nextInvoice: "2026-03-20", payer: "me" },
})
const running = project({ tools: [oneOff] })

assert.equal(toolCostInMonth(oneOff, running, "2026-03"), 500, "avulso bate no mês da fatura")
assert.equal(toolCostInMonth(oneOff, running, "2026-04"), 0, "avulso não repete")
assert.equal(toolCostInMonth(oneOff, running, "2025-12"), 0, "nada custa antes do projeto começar")

// --- a finished project stops costing after endedAt ---

const monthly = tool({
  billing: { amount: 80, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
})
const finished = project({
  status: "completed",
  endedAt: "2026-02-28",
  tools: [monthly],
})

assert.equal(toolCostInMonth(monthly, finished, "2026-02"), 80, "custa no mês em que terminou")
assert.equal(toolCostInMonth(monthly, finished, "2026-03"), 0, "para de custar depois do endedAt")

const costMonths = toolCostByMonth([finished], monthRange("2026-01", "2026-04"), "BRL")
assert.deepEqual(
  costMonths.map((month) => month.eu),
  [80, 80, 0, 0],
  "curva mensal cai quando o projeto acaba"
)

// --- who pays never gets mixed up ---

const shared = project({
  tools: [
    tool({ id: "aws", name: "AWS", billing: { amount: 300, cycle: "monthly", nextInvoice: "2026-01-05", payer: "client" } }),
    tool({ id: "neon", name: "Neon", billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" } }),
  ],
})
const oneMonth = monthRange("2026-01", "2026-01")
const costs = toolCostByTool([shared], oneMonth, "BRL")

assert.equal(costs.length, 2, "uma entrada por ferramenta paga")
assert.equal(costs[0].name, "AWS", "ordenado pelo total, do maior pro menor")
assert.equal(costs[0].cliente, 300, "AWS é do cliente")
assert.equal(costs[0].eu, 0, "AWS não entra no meu bolso")
assert.equal(costs[1].eu, 20, "Neon é meu")

// only my tools are subtracted from profit
const paid = project({
  deal: { kind: "upfront", amount: 1000 },
  startedAt: "2026-01-10",
  tools: shared.tools,
})
const profit = profitByProject([paid], oneMonth, "BRL")[0]
assert.equal(profit.receita, 1000, "receita é o valor fechado")
assert.equal(profit.custo, 20, "custo só conta o que eu pago")
assert.equal(profit.lucro, 980, "lucro = receita - o que eu pago")

// --- revenue over a full range adds back up to the deal ---

const installment = project({
  deal: { kind: "installment", amount: 3000, installments: 3 },
  startedAt: "2026-01-10",
})
const fullRange = monthRange("2026-01", "2026-03")
const revenue = revenueByMonth([installment], fullRange, "BRL")
const total = revenue.reduce(
  (sum, month) => sum + month.recebido + month.aReceber + month.atrasado,
  0
)
assert.equal(total, 3000, "as parcelas somam o valor fechado")
assert.equal(revenue.length, 3, "uma barra por mês do range")

// a range that misses the invoices drops them instead of piling them on month 1
const outside = revenueByMonth([installment], monthRange("2026-06", "2026-07"), "BRL")
assert.equal(
  outside.reduce((sum, month) => sum + month.recebido + month.aReceber + month.atrasado, 0),
  0,
  "fatura fora do range não é empurrada pra dentro"
)

// --- another currency is excluded, never converted ---

const inDollars = project({ id: "p2", deal: { kind: "upfront", amount: 5000, currency: "USD" } })
const mixed = financeSummary([installment, inDollars], fullRange, "BRL")
assert.equal(mixed.faturado, 3000, "só a moeda selecionada entra na conta")
assert.equal(mixed.foraDaMoeda, 1, "e o que ficou de fora é contado, não escondido")

// --- clients accumulate on their first project, and never double-count ---

const growth = clientGrowth(
  [
    project({ id: "a", clientId: "c1", startedAt: "2026-01-05" }),
    project({ id: "b", clientId: "c1", startedAt: "2026-02-05" }),
    project({ id: "c", clientId: "c2", startedAt: "2026-03-05" }),
  ],
  monthRange("2026-01", "2026-04")
)
assert.deepEqual(
  growth.map((month) => month.clientes),
  [1, 1, 2, 2],
  "o segundo projeto do mesmo cliente não cria um cliente novo"
)
assert.deepEqual(
  growth.map((month) => month.novos),
  [1, 0, 1, 0],
  "novos clientes por mês"
)

// --- categories fold onto fixed slots, never onto their rank ---

const categorized = toolCostByCategory(
  [
    project({
      tools: [
        tool({ id: "vercel", name: "Vercel", category: "deploy", billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" } }),
        tool({ id: "stripe", name: "Stripe", category: "payments", billing: { amount: 10, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" } }),
        tool({ id: "openai", name: "OpenAI", category: "ai", billing: { amount: 5, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" } }),
      ],
    }),
  ],
  oneMonth,
  "BRL"
)
assert.equal(categorized.length, 2, "payments e ai caem juntos em Outras")
assert.equal(categorized[0].label, "Deploy & Hosting", "deploy tem slot próprio")
assert.equal(categorized[0].slot, 1, "e o slot vem da categoria, não da posição")
assert.equal(categorized[1].label, "Outras", "o resto vira Outras")
assert.equal(categorized[1].total, 15, "Outras soma tudo que caiu nela")

// --- the comparison window is the same length, shifted back ---

assert.deepEqual(
  previousMonths(monthRange("2026-03", "2026-05")),
  ["2025-12", "2026-01", "2026-02"],
  "período anterior tem o mesmo tamanho"
)
assert.deepEqual(previousMonths([]), [], "range vazio não tem anterior")

console.log("dashboard-metrics: all checks passed")
