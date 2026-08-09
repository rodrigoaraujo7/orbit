import type { Invoice, PaymentMethod, Project } from "@/data/projects"

const PAYMENT_METHODS: PaymentMethod[] = ["boleto", "pix"]

function addMonths(date: Date, months: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}`
}

function toDateString(yearMonth: string, day: number) {
  return `${yearMonth}-${String(day).padStart(2, "0")}`
}

/**
 * ponytail: mock derivado do `deal` — não há API de faturas ainda, então a
 * fatura não é uma entidade própria com histórico, é calculada na hora.
 * Quando existir API: trocar por dado real vindo do backend (com status e
 * anexo editáveis de verdade, não determinados pelo índice da parcela).
 */
export function generateInvoices(project: Project): Invoice[] {
  const { deal } = project
  if (deal.kind === "gratis" || deal.amount == null) return []

  const installments = deal.kind === "parcelado" ? (deal.installments ?? 1) : 1
  const amount = deal.amount / installments
  const now = new Date()

  return Array.from({ length: installments }, (_, index) => {
    // primeira parcela paga, as demais pendentes — determinístico, sem
    // Math.random, pra não mudar a cada render.
    const isPaid = index === 0
    const referenceMonth =
      deal.kind === "parcelado" ? addMonths(now, index) : undefined
    const generatedMonth = referenceMonth ?? addMonths(now, 0)

    return {
      id: `${project.id}-invoice-${index + 1}`,
      referenceMonth,
      amount,
      status: isPaid ? "paga" : "pendente",
      paymentMethod: isPaid ? PAYMENT_METHODS[index % 2] : undefined,
      generatedAt: toDateString(generatedMonth, 5),
      paidAt: isPaid ? `${toDateString(generatedMonth, 10)}T14:32` : undefined,
      payerName: project.client,
      hasAttachment: isPaid,
    }
  })
}
