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

/** "(11) 98765-4321" (11 digits) or "(11) 3456-7890" (10). Caps at 11 digits. */
export function maskBrPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length === 0) return ""
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
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
export function formatDealProgress(
  deal: Deal,
  invoices: Pick<Invoice, "status">[] | { paid: number; total: number; overdue: number },
) {
  if (isDealFree(deal)) return FREE_LABEL
  if (deal.kind === "upfront") return "À vista"

  const paid = Array.isArray(invoices)
    ? invoices.filter((invoice) => invoice.status === "paid").length
    : invoices.paid
  const overdue = Array.isArray(invoices)
    ? invoices.filter((invoice) => invoice.status === "overdue").length
    : invoices.overdue
  const total = Array.isArray(invoices) ? invoices.length : invoices.total
  const base = `${paid} de ${total} parcelas pagas`
  return overdue > 0 ? `${base} · ${overdue} atrasada${overdue > 1 ? "s" : ""}` : base
}

/** "3 pagas · 2 grátis". */
export function formatToolsProgress(tools: Tool[]) {
  const paid = tools.filter((tool) => tool.billing).length
  const free = tools.length - paid
  return `${paid} ${paid === 1 ? "paga" : "pagas"} · ${free} grátis`
}

/** "2026-09" → "set/26". Short enough to fit an axis tick without rotating it. */
export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const label = new Date(year, monthNumber - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
  return `${label}/${String(year).slice(2)}`
}

/** "set. de 2026" — the long form, for tooltips where there is room. */
export function formatMonthLong(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  })
}

/** "R$ 18 mil" — axis ticks only; tooltips and tiles always show the full value. */
export function formatCompactCurrency(value: number, currency: string = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * 0.42 → "42%". Keeps one decimal so a 99,6% margin does not get rounded up to
 * a "100%" that reads as "this project had no costs at all".
 */
export function formatPercent(ratio: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(ratio)
}
