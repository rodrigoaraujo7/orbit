import type { AuditModule } from "shared"

import type {
  BillingCycle,
  DealKind,
  InvoiceStatus,
  Payer,
  PaymentMethod,
  ProjectStatus,
  WorkflowStatus,
} from "../data/projects.ts"
import { TOOL_CATEGORY_ORDER, type ToolCategory } from "../data/tool-catalog.ts"
import i18n from "./index.ts"

export function statusLabel(status: ProjectStatus | string) {
  return i18n.t(`status.${status}`, { defaultValue: status })
}

export function dealKindLabel(kind: DealKind) {
  return i18n.t(`deal.${kind}`)
}

export function freeLabel() {
  return i18n.t("deal.free")
}

export function invoiceStatusLabel(status: InvoiceStatus) {
  return i18n.t(`invoice.${status}`)
}

export function paymentMethodLabel(method: PaymentMethod) {
  return i18n.t(`payment.${method}`)
}

export function billingCycleLabel(cycle: BillingCycle) {
  return i18n.t(`billing.${cycle}`)
}

export function payerLabel(payer: Payer) {
  return i18n.t(`payer.${payer}`)
}

export function workflowStatusLabel(status: WorkflowStatus) {
  return i18n.t(`workflow.${status}`)
}

export function workflowStatusTooltip(status: WorkflowStatus) {
  return i18n.t(`workflow.tooltip.${status}`)
}

export function toolCategoryLabel(category: ToolCategory) {
  return i18n.t(`category.${category}`)
}

export function categoryCostLabel(key: string) {
  return key === "other" ? i18n.t("category.otherBucket") : i18n.t(`category.${key}`)
}

export const AUDIT_MODULES: AuditModule[] = ["project", "kanban", "settings", "security"]

export function auditModuleLabel(module: AuditModule) {
  return i18n.t(`audit.modules.${module}`)
}

const AUDIT_ACTION_OVERRIDE: Record<string, string> = {
  "security.login.failed": "audit.loginFailed",
  "credential.reveal.attempt": "audit.revealAttempt",
}

export function auditActionLabel(action: string) {
  const key = AUDIT_ACTION_OVERRIDE[action] ?? `audit.actions.${action}`
  const translated = i18n.t(key)
  return translated === key ? action : translated
}

export function auditFieldLabel(field: string) {
  const key = `audit.fields.${field}`
  const translated = i18n.t(key)
  return translated === key ? field : translated
}

export function dash() {
  return i18n.t("common.emDash")
}

export function dealKindOptions() {
  return (["upfront", "installment"] as const).map((value) => ({
    value,
    label: dealKindLabel(value),
  }))
}

export function billingCycleOptions() {
  return (["monthly", "yearly", "one-off"] as const).map((value) => ({
    value,
    label: billingCycleLabel(value),
  }))
}

export function payerOptions() {
  return (["me", "client"] as const).map((value) => ({
    value,
    label: payerLabel(value),
  }))
}

export function toolCategoryOptions() {
  return TOOL_CATEGORY_ORDER.map((category) => ({
    value: category,
    label: toolCategoryLabel(category),
  }))
}

export function auditModuleOptions() {
  return [
    { value: "", label: i18n.t("audit.allModules") },
    ...AUDIT_MODULES.map((value) => ({ value, label: auditModuleLabel(value) })),
  ]
}
