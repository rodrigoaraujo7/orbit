import type { Invoice, InvoiceStatus } from "@/data/projects"

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
