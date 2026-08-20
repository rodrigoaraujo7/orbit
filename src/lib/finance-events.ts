/**
 * Every event the Financeiro page draws — calendar dots and the global
 * invoices table — is computed here. Pure functions, no React.
 *
 * Relative imports (not the "@/" alias) on purpose for value imports: the
 * self-check runs on `node --experimental-strip-types`, and Node does not
 * resolve the alias. Type-only imports are erased at strip time, so those can
 * use "@/..." freely.
 */
import type { InvoiceStatus, Project } from "@/data/projects"
import { DEFAULT_CURRENCY } from "./currency.ts"
import { todayIso } from "./dates.ts"
import { generateInvoices } from "./invoices.ts"

export type FinanceEventType = "receivable" | "payable"

export type FinanceEvent = {
  /** Invoice.id for receivables, `${project.id}-tool-${tool.id}` for payables. */
  id: string
  /** "YYYY-MM-DD" — the invoice's due date, or the tool's next charge. */
  date: string
  type: FinanceEventType
  /** Payables never reach "paid" — there is no billing history, only the next charge. */
  status: InvoiceStatus
  amount: number
  currency: string
  projectId: string
  projectName: string
  /** Installment reference or tool name — what shows up as the event's title. */
  label: string
}

/**
 * Receivables (client invoices) + payables (tools the freelancer pays for),
 * merged into one timeline and sorted by date.
 *
 * `payerNameFor` resolves a project's client name for `generateInvoices` —
 * same contract the invoices table on the project page already uses.
 */
export function financeEvents(
  projects: Project[],
  payerNameFor: (clientId: string) => string
): FinanceEvent[] {
  const events: FinanceEvent[] = []

  for (const project of projects) {
    for (const invoice of generateInvoices(project, payerNameFor(project.clientId))) {
      events.push({
        id: invoice.id,
        date: invoice.generatedAt,
        type: "receivable",
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        projectId: project.id,
        projectName: project.name,
        label: invoice.referenceMonth ? `Parcela ${invoice.referenceMonth}` : "Pagamento único",
      })
    }

    for (const tool of project.tools) {
      if (!tool.billing || tool.billing.payer !== "me") continue
      events.push({
        id: `${project.id}-tool-${tool.id}`,
        date: tool.billing.nextInvoice,
        type: "payable",
        status: tool.billing.nextInvoice < todayIso() ? "overdue" : "pending",
        amount: tool.billing.amount,
        currency: tool.billing.currency ?? DEFAULT_CURRENCY,
        projectId: project.id,
        projectName: project.name,
        label: tool.name,
      })
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
