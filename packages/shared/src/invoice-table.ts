import type { InvoiceStatus } from './domain.ts'
import type { Invoice } from './project.ts'

/**
 * The invoice's "effective month" for date filtering: `referenceMonth` when it
 * exists (installment deal); otherwise falls back to `generatedAt` truncated to
 * "YYYY-MM" — the upfront deal case, which has no installment/reference month.
 */
export function effectiveMonth(invoice: Invoice): string {
  return invoice.referenceMonth ?? invoice.generatedAt.slice(0, 7)
}

export type InvoiceFilters = {
  status: InvoiceStatus | 'all'
  monthFrom: string
  monthTo: string
}

export function filterInvoices(invoices: Invoice[], filters: InvoiceFilters): Invoice[] {
  return invoices.filter((invoice) => {
    if (filters.status !== 'all' && invoice.status !== filters.status) return false
    const month = effectiveMonth(invoice)
    if (filters.monthFrom && month < filters.monthFrom) return false
    if (filters.monthTo && month > filters.monthTo) return false
    return true
  })
}
