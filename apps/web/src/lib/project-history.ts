import {
  PROJECT_STATUS_LABEL,
  type Deal,
  type Project,
  type ProjectHistoryEntry,
  type ProjectHistoryField,
  type ProjectStatus,
  type Tool,
} from "../data/projects.ts"
import { DEFAULT_CURRENCY } from "./currency.ts"
import { nowDateTimeIso } from "./dates.ts"

export function projectChanges(
  prev: Project,
  next: Project
): Pick<ProjectHistoryEntry, "field" | "from" | "to">[] {
  const entries: Pick<ProjectHistoryEntry, "field" | "from" | "to">[] = []

  function add(field: ProjectHistoryField, from: string, to: string) {
    if (from === to) return
    entries.push({ field, from, to })
  }

  add("name", prev.name, next.name)
  add("status", prev.status, next.status)
  add(
    "description",
    prev.description?.trim() ?? "",
    next.description?.trim() ?? ""
  )
  add("clientId", prev.clientId, next.clientId)
  add("deal", dealSnapshot(prev.deal), dealSnapshot(next.deal))

  if (toolsFingerprint(prev.tools) !== toolsFingerprint(next.tools)) {
    entries.push({
      field: "tools",
      from: toolsSnapshot(prev.tools),
      to: toolsSnapshot(next.tools),
    })
  }

  add("repo", repoSnapshot(prev.repo), repoSnapshot(next.repo))
  return entries
}

export function withProjectHistory(
  prev: Project,
  next: Project,
  at = nowDateTimeIso()
): Project {
  const changes = projectChanges(prev, next)
  if (changes.length === 0) return { ...next, history: prev.history }
  return {
    ...next,
    history: [
      ...(prev.history ?? []),
      ...changes.map((change) => ({
        ...change,
        id: crypto.randomUUID(),
        at,
      })),
    ],
  }
}

export function recordProjectHistory(
  current: Project[],
  next: Project[],
  at = nowDateTimeIso()
): Project[] {
  return next.map((project) => {
    const prev = current.find((item) => item.id === project.id)
    return prev ? withProjectHistory(prev, project, at) : project
  })
}

const FIELD_LABEL: Record<ProjectHistoryField, string> = {
  name: "Nome",
  status: "Status",
  description: "Descrição",
  clientId: "Cliente",
  deal: "Valor",
  tools: "Ferramentas",
  repo: "Repositório",
}

export function formatHistoryEntry(
  entry: ProjectHistoryEntry,
  clientName?: (id: string) => string
): string {
  if (entry.field === "description") return "Descrição atualizada"
  if (entry.field === "status") {
    const from = PROJECT_STATUS_LABEL[entry.from as ProjectStatus] ?? entry.from
    const to = PROJECT_STATUS_LABEL[entry.to as ProjectStatus] ?? entry.to
    return `Status: ${from} → ${to}`
  }
  const from = entry.field === "clientId" ? (clientName?.(entry.from) ?? entry.from) : entry.from
  const to = entry.field === "clientId" ? (clientName?.(entry.to) ?? entry.to) : entry.to
  return `${FIELD_LABEL[entry.field]}: ${from} → ${to}`
}

function dealSnapshot(deal: Deal): string {
  if (deal.amount <= 0) return "Grátis"
  const currency = deal.currency ?? DEFAULT_CURRENCY
  if (deal.kind === "installment") {
    return `${deal.amount} ${currency} em ${deal.installments}x`
  }
  return `${deal.amount} ${currency} à vista`
}

function toolsSnapshot(tools: Tool[]): string {
  return tools.map((tool) => tool.name).join(", ") || "—"
}

function toolsFingerprint(tools: Tool[]): string {
  return JSON.stringify(
    tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      account: tool.account ?? "",
      billing: tool.billing ?? null,
      secrets: tool.secrets.map((secret) => ({
        key: secret.key,
        value: secret.value,
      })),
    }))
  )
}

function repoSnapshot(repo: Project["repo"]): string {
  return repo?.fullName || "—"
}
