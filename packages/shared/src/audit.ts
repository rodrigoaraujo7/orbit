import { z } from "zod"

export const auditModuleSchema = z.enum([
  "project",
  "kanban",
  "settings",
  "security",
])
export type AuditModule = z.infer<typeof auditModuleSchema>

export const auditChangeSchema = z.object({
  field: z.string(),
  from: z.string(),
  to: z.string(),
})
export type AuditChange = z.infer<typeof auditChangeSchema>

export const AUDIT_ACTIONS = [
  "project.create",
  "project.update",
  "project.delete",
  "kanban.move",
  "kanban.update",
  "kanban.comment.create",
  "kanban.comment.edit",
  "kanban.comment.delete",
  "financial.update",
  "financial.invoice.create",
  "financial.invoice.status",
  "financial.payment.create",
  "tools.update",
  "tools.custom.create",
  "tools.custom.update",
  "tools.custom.delete",
  "contact.create",
  "contact.update",
  "contact.delete",
  "security.login",
  "security.logout",
  "security.login.failed",
  "security.password.change",
  "security.2fa.enable",
  "security.2fa.disable",
  "credential.reveal",
  "credential.reveal.attempt",
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]
