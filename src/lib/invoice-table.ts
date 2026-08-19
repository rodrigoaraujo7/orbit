// Relative import: same reason as invoices.ts — this runs in the self-checks.
import type { Invoice, InvoiceStatus } from "../data/projects.ts"

/**
 * The invoice's "effective month" for date filtering: `referenceMonth` when it
 * exists (installment deal); otherwise falls back to `generatedAt` truncated to
 * "YYYY-MM" — the upfront deal case, which has no installment/reference month.
 */
export function effectiveMonth(invoice: Invoice): string {
  return invoice.referenceMonth ?? invoice.generatedAt.slice(0, 7)
}

export function filterInvoices(
  invoices: Invoice[],
  filters: { status: InvoiceStatus | "all"; monthFrom: string; monthTo: string }
): Invoice[] {
  return invoices.filter((invoice) => {
    if (filters.status !== "all" && invoice.status !== filters.status) return false
    const month = effectiveMonth(invoice)
    if (filters.monthFrom && month < filters.monthFrom) return false
    if (filters.monthTo && month > filters.monthTo) return false
    return true
  })
}
