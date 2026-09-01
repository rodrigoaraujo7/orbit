import type {
  BillingCycle,
  DealKind,
  InvoiceStatus,
  Payer,
  PaymentMethod,
  ProjectStatus,
} from "./domain.ts"
import type { ToolCategory } from "./tool-category.ts"

export type Deal = {
  kind: DealKind
  amount: number
  installments?: number
  currency?: string
}

/** Same rule as the form: zeroed (or negative) amount = free. */
export function isDealFree(deal: Deal): boolean {
  return deal.amount <= 0
}

export type ToolBilling = {
  amount: number
  cycle: BillingCycle
  nextInvoice: string
  payer: Payer
  currency?: string
}

export type Tool = {
  id: string
  name: string
  category: ToolCategory
  account?: string
  billing?: ToolBilling
  secrets?: { key: string; value: string }[]
}

export type Project = {
  id: string
  name: string
  clientId: string
  status: ProjectStatus
  startedAt: string
  endedAt?: string
  deal: Deal
  tools: Tool[]
  repo?: {
    fullName: string
    url: string
    workflow: string
  } | null
  description?: string
  comments?: unknown[]
}

export type Invoice = {
  id: string
  referenceMonth?: string
  amount: number
  status: InvoiceStatus
  paymentMethod?: PaymentMethod
  generatedAt: string
  paidAt?: string
  payerName: string
  hasAttachment: boolean
  currency: string
}
