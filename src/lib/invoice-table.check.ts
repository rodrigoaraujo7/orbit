/**
 * Self-check de filtro/ordenação de faturas (ver invoice-table.ts).
 * Roda com: pnpm check:invoice-table
 */
import { effectiveMonth, filterInvoices, sortInvoices } from "./invoice-table.ts"
import type { Invoice } from "@/data/projects"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`esperado ${e}, recebido ${a}`)
  },
}

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    amount: 100,
    status: "pendente",
    generatedAt: "2026-01-05",
    payerName: "Cliente",
    hasAttachment: false,
    currency: "BRL",
    ...overrides,
  }
}

// mês efetivo: usa referenceMonth quando existe
assert.deepEqual(effectiveMonth(invoice({ referenceMonth: "2026-03" })), "2026-03")
// deal à vista: sem referenceMonth, cai pro mês de generatedAt
assert.deepEqual(effectiveMonth(invoice({ generatedAt: "2026-01-05" })), "2026-01")

const jan = invoice({ id: "jan", referenceMonth: "2026-01", status: "paga" })
const feb = invoice({ id: "feb", referenceMonth: "2026-02", status: "pendente" })
const mar = invoice({ id: "mar", referenceMonth: "2026-03", status: "atrasada" })
const list = [jan, feb, mar]

// filtro de status
assert.deepEqual(
  filterInvoices(list, { status: "pendente", monthFrom: "", monthTo: "" }).map((i) => i.id),
  ["feb"]
)
assert.deepEqual(
  filterInvoices(list, { status: "todos", monthFrom: "", monthTo: "" }).map((i) => i.id),
  ["jan", "feb", "mar"]
)

// filtro de mês (intervalo)
assert.deepEqual(
  filterInvoices(list, { status: "todos", monthFrom: "2026-02", monthTo: "2026-03" }).map(
    (i) => i.id
  ),
  ["feb", "mar"]
)

// ordenação por valor, asc/desc
const byAmount = [invoice({ id: "a", amount: 30 }), invoice({ id: "b", amount: 10 }), invoice({ id: "c", amount: 20 })]
assert.deepEqual(
  sortInvoices(byAmount, "amount", "asc").map((i) => i.id),
  ["b", "c", "a"]
)
assert.deepEqual(
  sortInvoices(byAmount, "amount", "desc").map((i) => i.id),
  ["a", "c", "b"]
)

// sortKey null devolve ordem original, sem mutar o array de entrada
assert.deepEqual(sortInvoices(list, null, "asc").map((i) => i.id), ["jan", "feb", "mar"])
assert.deepEqual(list.map((i) => i.id), ["jan", "feb", "mar"])

console.log("invoice-table: todos os checks passaram")
