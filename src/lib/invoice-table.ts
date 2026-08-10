import type { Invoice, InvoiceStatus } from "@/data/projects"

export type InvoiceSortKey = "amount" | "month" | "paymentMethod" | "status"
export type SortDirection = "asc" | "desc"

/**
 * "Mês efetivo" da fatura pra filtro de data: `referenceMonth` quando existe
 * (deal parcelado); senão cai pra `generatedAt` truncado em "YYYY-MM" — é o
 * caso do deal à vista, que não tem parcela/mês de referência.
 */
export function effectiveMonth(invoice: Invoice): string {
  return invoice.referenceMonth ?? invoice.generatedAt.slice(0, 7)
}

export function filterInvoices(
  invoices: Invoice[],
  filters: { status: InvoiceStatus | "todos"; monthFrom: string; monthTo: string }
): Invoice[] {
  return invoices.filter((invoice) => {
    if (filters.status !== "todos" && invoice.status !== filters.status) return false
    const month = effectiveMonth(invoice)
    if (filters.monthFrom && month < filters.monthFrom) return false
    if (filters.monthTo && month > filters.monthTo) return false
    return true
  })
}

const PAYMENT_METHOD_SORT_WEIGHT: Record<string, number> = { boleto: 0, pix: 1 }
const STATUS_SORT_WEIGHT: Record<InvoiceStatus, number> = { pendente: 0, atrasada: 1, paga: 2 }

function sortValue(invoice: Invoice, key: InvoiceSortKey): number | string {
  switch (key) {
    case "amount":
      return invoice.amount
    case "month":
      return effectiveMonth(invoice)
    case "paymentMethod":
      return invoice.paymentMethod ? PAYMENT_METHOD_SORT_WEIGHT[invoice.paymentMethod] : -1
    case "status":
      return STATUS_SORT_WEIGHT[invoice.status]
  }
}

/** `sortKey: null` devolve a ordem original (sem cópia extra além do slice). */
export function sortInvoices(
  invoices: Invoice[],
  sortKey: InvoiceSortKey | null,
  direction: SortDirection
): Invoice[] {
  if (!sortKey) return invoices
  const factor = direction === "asc" ? 1 : -1
  return [...invoices].sort((a, b) => {
    const va = sortValue(a, sortKey)
    const vb = sortValue(b, sortKey)
    if (va < vb) return -1 * factor
    if (va > vb) return 1 * factor
    return 0
  })
}
