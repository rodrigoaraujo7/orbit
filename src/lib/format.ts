import { DEAL_KIND_LABEL, type Deal } from "@/data/projects"

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function formatCurrency(value: number) {
  return brl.format(value)
}

/**
 * "2026-09-05" → "05/09/2026". Parse manual de propósito: `new Date("2026-09-05")`
 * é interpretado como UTC e volta um dia no fuso do Brasil.
 */
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  return year && month && day ? `${day}/${month}/${year}` : iso
}

/** "R$ 18.000,00 em 3x", "R$ 7.200,00 à vista" ou "Grátis". */
export function formatDeal(deal: Deal) {
  if (deal.kind === "gratis" || deal.amount == null) {
    return DEAL_KIND_LABEL.gratis
  }
  const amount = formatCurrency(deal.amount)
  return deal.kind === "parcelado" && deal.installments
    ? `${amount} em ${deal.installments}x`
    : `${amount} à vista`
}
