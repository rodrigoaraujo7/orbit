import { isDealFree, type Deal, type Invoice, type Tool } from "../data/projects.ts"
import i18n, { getLocale } from "../i18n/index.ts"
import { DEFAULT_CURRENCY } from "./currency.ts"

// one Intl.NumberFormat per locale+currency, created on demand and reused
const formatters = new Map<string, Intl.NumberFormat>()
const percentFormatters = new Map<string, Intl.NumberFormat>()
const compactFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string) {
  const locale = getLocale()
  const key = `${locale}:${currency}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency })
    formatters.set(key, formatter)
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
 * "2026-09-05" → "09/05/2026" (en-US) or "05/09/2026" (pt-BR). Parsed by hand
 * on purpose: `new Date("2026-09-05")` is read as UTC and goes back a day in
 * Brazil's timezone.
 */
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return getLocale() === "en-US" ? `${month}/${day}/${year}` : `${day}/${month}/${year}`
}

/** "2026-08-10T14:32" → date + time. Same manual parse as `formatDate`. */
export function formatDateTime(iso: string) {
  const [datePart, time] = iso.split("T")
  return time ? `${formatDate(datePart)} ${time}` : formatDate(datePart)
}

/** "$18,000.00 in 3x", "R$ 18.000,00 à vista" or "Free"/"Grátis". */
export function formatDeal(deal: Deal) {
  if (isDealFree(deal)) return i18n.t("deal.free")
  const amount = formatCurrency(deal.amount, deal.currency)
  return deal.kind === "installment" && deal.installments
    ? i18n.t("format.inInstallments", { amount, count: deal.installments })
    : i18n.t("format.upfrontAmount", { amount })
}

/** "Upfront", "3 of 3 installments paid" or "1 of 3 installments paid · 2 overdue". */
export function formatDealProgress(
  deal: Deal,
  invoices: Pick<Invoice, "status">[] | { paid: number; total: number; overdue: number },
) {
  if (isDealFree(deal)) return i18n.t("deal.free")
  if (deal.kind === "upfront") return i18n.t("deal.upfront")

  const paid = Array.isArray(invoices)
    ? invoices.filter((invoice) => invoice.status === "paid").length
    : invoices.paid
  const overdue = Array.isArray(invoices)
    ? invoices.filter((invoice) => invoice.status === "overdue").length
    : invoices.overdue
  const total = Array.isArray(invoices) ? invoices.length : invoices.total
  const base = i18n.t("format.installmentsPaid", { paid, total })
  return overdue > 0 ? `${base} · ${i18n.t("format.overdue", { count: overdue })}` : base
}

/** "3 paid · 2 free". */
export function formatToolsProgress(tools: Tool[]) {
  const paid = tools.filter((tool) => tool.billing).length
  const free = tools.length - paid
  return i18n.t("format.toolsProgress", { count: paid, paid, free })
}

/** "2026-09" → "Sep/26" or "set/26". Short enough to fit an axis tick. */
export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const label = new Date(year, monthNumber - 1, 1)
    .toLocaleDateString(getLocale(), { month: "short" })
    .replace(".", "")
  return `${label}/${String(year).slice(2)}`
}

/** Long month label for tooltips where there is room. */
export function formatMonthLong(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(getLocale(), {
    month: "short",
    year: "numeric",
  })
}

/** Compact currency for axis ticks only; tooltips and tiles show the full value. */
export function formatCompactCurrency(value: number, currency: string = DEFAULT_CURRENCY) {
  const locale = getLocale()
  const key = `${locale}:${currency}`
  let formatter = compactFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    })
    compactFormatters.set(key, formatter)
  }
  return formatter.format(value)
}

/**
 * 0.42 → "42%". Keeps one decimal so a 99.6% margin does not get rounded up to
 * a "100%" that reads as "this project had no costs at all".
 */
export function formatPercent(ratio: number) {
  const locale = getLocale()
  let formatter = percentFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    })
    percentFormatters.set(locale, formatter)
  }
  return formatter.format(ratio)
}
