import { FREE_LABEL, isDealFree, type Deal, type Invoice, type Tool } from "@/data/projects"
import { DEFAULT_CURRENCY } from "@/lib/currency"

// one Intl.NumberFormat per currency, created on demand and reused — same
// idea as the old BRL-only formatter, just keyed by currency.
const formatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string) {
  let formatter = formatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency })
    formatters.set(currency, formatter)
  }
  return formatter
}

export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY) {
  return currencyFormatter(currency).format(value)
}

/**
 * "2026-09-05" → "05/09/2026". Parsed by hand on purpose: `new Date("2026-09-05")`
 * is read as UTC and goes back a day in Brazil's timezone.
 */
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  return year && month && day ? `${day}/${month}/${year}` : iso
}

/** "2026-08-10T14:32" → "10/08/2026 14:32". Same manual parse as `formatDate`. */
export function formatDateTime(iso: string) {
  const [datePart, time] = iso.split("T")
  return time ? `${formatDate(datePart)} ${time}` : formatDate(datePart)
}

/** "R$ 18.000,00 em 3x", "R$ 7.200,00 à vista" or "Grátis". */
export function formatDeal(deal: Deal) {
  if (isDealFree(deal)) return FREE_LABEL
  const amount = formatCurrency(deal.amount, deal.currency)
  return deal.kind === "installment" && deal.installments
    ? `${amount} em ${deal.installments}x`
    : `${amount} à vista`
}

/** "À vista", "3 de 3 parcelas pagas" or "1 de 3 parcelas pagas · 2 atrasadas". */
export function formatDealProgress(deal: Deal, invoices: Invoice[]) {
  if (isDealFree(deal)) return FREE_LABEL
  if (deal.kind === "upfront") return "À vista"

  const paid = invoices.filter((invoice) => invoice.status === "paid").length
  const overdue = invoices.filter((invoice) => invoice.status === "overdue").length
  const base = `${paid} de ${invoices.length} parcelas pagas`
  return overdue > 0 ? `${base} · ${overdue} atrasada${overdue > 1 ? "s" : ""}` : base
}

/** "3 pagas · 2 grátis". */
export function formatToolsProgress(tools: Tool[]) {
  const paid = tools.filter((tool) => tool.billing).length
  const free = tools.length - paid
  return `${paid} ${paid === 1 ? "paga" : "pagas"} · ${free} grátis`
}
