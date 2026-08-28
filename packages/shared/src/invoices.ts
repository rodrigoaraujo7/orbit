import { DEFAULT_CURRENCY } from "./currency.ts"
import { addMonths, dayOfMonth, monthOf, todayIso } from "./dates.ts"
import type { InvoiceStatus, PaymentMethod } from "./domain.ts"
import { isDealFree, type Invoice, type Project } from "./project.ts"

const PAYMENT_METHODS: PaymentMethod[] = ["boleto", "pix"]

/**
 * Mock derived from the `deal` — there's no persisted invoice API yet, so an
 * invoice isn't an entity of its own with history, it's computed on the fly.
 *
 * Anchored on `project.startedAt`, not on today: that's what gives the platform
 * a real timeline (past installments already paid, future ones still open) and
 * what the dashboard charts read.
 */
export function generateInvoices(project: Project, payerName: string): Invoice[] {
  const { deal } = project
  if (isDealFree(deal)) return []

  const installments = deal.kind === "installment" ? (deal.installments ?? 1) : 1
  const amount = deal.amount / installments
  const today = todayIso()
  const startMonth = monthOf(project.startedAt)
  const billingDay = Number(project.startedAt.slice(8, 10))

  const dueDates = Array.from({ length: installments }, (_, index) =>
    dayOfMonth(addMonths(startMonth, index), billingDay),
  )
  // Only reason `overdue` exists in the mock: one deterministic late payer, so
  // the dashboard has something to show in the "atrasado" series. A paused
  // project is the believable candidate — it stopped because nobody paid.
  const lastDueIndex = dueDates.findLastIndex((dueDate) => dueDate < today)
  const overdueIndex = project.status === "paused" ? lastDueIndex : -1

  return dueDates.map((dueDate, index) => {
    const isPaid = dueDate < today && index !== overdueIndex
    const status: InvoiceStatus = isPaid ? "paid" : index === overdueIndex ? "overdue" : "pending"

    return {
      id: `${project.id}-invoice-${index + 1}`,
      referenceMonth: deal.kind === "installment" ? monthOf(dueDate) : undefined,
      amount,
      status,
      paymentMethod: isPaid ? PAYMENT_METHODS[index % 2] : undefined,
      generatedAt: dueDate,
      paidAt: isPaid ? `${dueDate}T14:32` : undefined,
      payerName,
      hasAttachment: isPaid,
      currency: deal.currency ?? DEFAULT_CURRENCY,
    }
  })
}
