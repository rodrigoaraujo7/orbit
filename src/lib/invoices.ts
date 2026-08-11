import { isDealFree, type Invoice, type PaymentMethod, type Project } from "@/data/projects"
import { DEFAULT_CURRENCY } from "@/lib/currency"

const PAYMENT_METHODS: PaymentMethod[] = ["boleto", "pix"]

function addMonths(date: Date, months: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}`
}

function toDateString(yearMonth: string, day: number) {
  return `${yearMonth}-${String(day).padStart(2, "0")}`
}

/**
 * ponytail: mock derived from the `deal` — there's no invoice API yet, so an
 * invoice isn't an entity of its own with history, it's computed on the fly.
 * Once the API exists: swap for real backend data (with genuinely editable
 * status and attachment, not decided by the installment index).
 */
export function generateInvoices(project: Project): Invoice[] {
  const { deal } = project
  if (isDealFree(deal)) return []

  const installments = deal.kind === "installment" ? (deal.installments ?? 1) : 1
  const amount = deal.amount / installments
  const now = new Date()

  return Array.from({ length: installments }, (_, index) => {
    // first installment paid, the rest pending — deterministic, no
    // Math.random, so it doesn't change on every render.
    const isPaid = index === 0
    const referenceMonth =
      deal.kind === "installment" ? addMonths(now, index) : undefined
    const generatedMonth = referenceMonth ?? addMonths(now, 0)

    return {
      id: `${project.id}-invoice-${index + 1}`,
      referenceMonth,
      amount,
      status: isPaid ? "paid" : "pending",
      paymentMethod: isPaid ? PAYMENT_METHODS[index % 2] : undefined,
      generatedAt: toDateString(generatedMonth, 5),
      paidAt: isPaid ? `${toDateString(generatedMonth, 10)}T14:32` : undefined,
      payerName: project.client,
      hasAttachment: isPaid,
      currency: deal.currency ?? DEFAULT_CURRENCY,
    }
  })
}
