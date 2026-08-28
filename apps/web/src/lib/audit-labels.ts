import type { AuditChange, AuditModule } from "shared"

import { PROJECT_STATUS_LABEL, type ProjectStatus } from "../data/projects.ts"
import { getLocale } from "../i18n/index.ts"

export const AUDIT_MODULE_LABEL: Record<AuditModule, string> = {
  project: "Projetos",
  kanban: "Kanban",
  settings: "Configurações",
  security: "Segurança",
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "project.create": "Projeto criado",
  "project.update": "Projeto editado",
  "project.delete": "Projeto excluído",
  "kanban.move": "Status alterado",
  "kanban.update": "Kanban atualizado",
  "kanban.comment.create": "Comentário adicionado",
  "kanban.comment.edit": "Comentário editado",
  "kanban.comment.delete": "Comentário excluído",
  "financial.update": "Financeiro editado",
  "financial.invoice.create": "Fatura criada",
  "financial.invoice.status": "Status da fatura",
  "financial.payment.create": "Pagamento registrado",
  "tools.update": "Ferramentas editadas",
  "tools.custom.create": "Ferramenta criada",
  "tools.custom.update": "Ferramenta editada",
  "tools.custom.delete": "Ferramenta excluída",
  "contact.create": "Contato criado",
  "contact.update": "Contato editado",
  "contact.delete": "Contato excluído",
  "security.login": "Login",
  "security.logout": "Logout",
  "security.login.failed": "Login falhou",
  "security.password.change": "Senha alterada",
  "security.2fa.enable": "2FA ativado",
  "security.2fa.disable": "2FA desativado",
  "credential.reveal": "Segredo revelado",
  "credential.reveal.attempt": "Tentativa de revelar segredo",
}

const FIELD_LABEL: Record<string, string> = {
  name: "Nome",
  status: "Status",
  description: "Descrição",
  clientId: "Cliente",
  startedAt: "Início",
  endedAt: "Término",
  repo: "Repositório",
  "deal.kind": "Tipo do valor",
  "deal.amount": "Valor",
  "deal.installments": "Parcelas",
  email: "E-mail",
  phone: "Telefone",
  company: "Empresa",
  category: "Categoria",
}

function statusLabel(value: string) {
  return PROJECT_STATUS_LABEL[value as ProjectStatus] ?? value
}

export function formatAuditChange(
  change: AuditChange,
  clientName?: (id: string) => string,
): string {
  if (change.field === "description") return "Descrição atualizada"
  if (change.field === "status") {
    return `Status: ${statusLabel(change.from)} → ${statusLabel(change.to)}`
  }
  if (change.field === "comment.created") return "Comentário adicionado"
  if (change.field === "comment.edited") return "Comentário editado"
  if (change.field === "comment.deleted") return "Comentário excluído"

  const secret = change.field.match(/^tool\.[^.]+\.secret\.(.+)$/)
  if (secret) {
    const key = secret[1]
    if (!change.from) return `Segredo ${key} definido`
    if (!change.to) return `Segredo ${key} removido`
    return `Segredo ${key} atualizado`
  }

  const toolField = change.field.match(/^tool\.([^.]+)(?:\.(account|billing))?$/)
  if (toolField) {
    if (toolField[2] === "account") {
      return `Conta: ${change.from || "—"} → ${change.to || "—"}`
    }
    if (toolField[2] === "billing") {
      return `Cobrança: ${change.from || "—"} → ${change.to || "—"}`
    }
    if (!change.from) return `Ferramenta adicionada: ${change.to}`
    if (!change.to) return `Ferramenta removida: ${change.from}`
  }

  const from =
    change.field === "clientId" ? (clientName?.(change.from) ?? change.from) : change.from
  const to = change.field === "clientId" ? (clientName?.(change.to) ?? change.to) : change.to
  const label = FIELD_LABEL[change.field] ?? change.field
  return `${label}: ${from || "—"} → ${to || "—"}`
}

export function formatAuditAt(iso: string) {
  return new Date(iso).toLocaleString(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatAuditDetails(
  changes: AuditChange[],
  action: string,
  clientName?: (id: string) => string,
) {
  if (changes.length === 0) return AUDIT_ACTION_LABEL[action] ?? action
  const shown = changes.slice(0, 2).map((change) => formatAuditChange(change, clientName))
  const extra = changes.length - shown.length
  return extra > 0 ? `${shown.join(" · ")} · +${extra}` : shown.join(" · ")
}
