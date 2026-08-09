import { FREE_LABEL, isDealFree, type Deal } from "@/data/projects"
import { DEFAULT_CURRENCY } from "@/lib/currency"

// um Intl.NumberFormat por moeda, criado sob demanda e reaproveitado —
// mesma ideia do antigo formatter fixo em BRL, só que por moeda.
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
 * "2026-09-05" → "05/09/2026". Parse manual de propósito: `new Date("2026-09-05")`
 * é interpretado como UTC e volta um dia no fuso do Brasil.
 */
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  return year && month && day ? `${day}/${month}/${year}` : iso
}

/** "2026-08-10T14:32" → "10/08/2026 14:32". Mesmo parse manual de `formatDate`. */
export function formatDateTime(iso: string) {
  const [datePart, time] = iso.split("T")
  return time ? `${formatDate(datePart)} ${time}` : formatDate(datePart)
}

/** "R$ 18.000,00 em 3x", "R$ 7.200,00 à vista" ou "Grátis". */
export function formatDeal(deal: Deal) {
  if (isDealFree(deal)) return FREE_LABEL
  const amount = formatCurrency(deal.amount, deal.currency)
  return deal.kind === "parcelado" && deal.installments
    ? `${amount} em ${deal.installments}x`
    : `${amount} à vista`
}
