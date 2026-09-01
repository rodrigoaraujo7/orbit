import { fromCents, toCents, type AuditChange, type AuditModule } from 'shared'

export type ProjectCommentInput = {
  id: string
  body?: string
  author?: string
  createdAt?: string
}

export type ProjectToolInput = {
  id: string
  name: string
  account?: string | null
  billing?: {
    amount: number
    cycle: string
    nextInvoice: string
    payer: string
    currency?: string
  } | null
  secrets: { key: string; value?: string }[]
}

export type ProjectDiffInput = {
  name: string
  clientId: string
  status: string
  startedAt: string
  endedAt?: string | null
  deal: {
    kind: string
    amount: number
    installments?: number | null
    currency?: string
  }
  repo: { fullName: string } | null
  description?: string | null
  comments?: unknown
  tools: ProjectToolInput[]
}

export type DiffEntry = {
  module: AuditModule
  action: string
  changes: AuditChange[]
}

function add(changes: AuditChange[], field: string, from: string, to: string) {
  if (from === to) return
  changes.push({ field, from, to })
}

function commentsOf(value: unknown): { id: string; body: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Record<string, unknown>
    if (typeof rec.id !== 'string') return []
    return [{ id: rec.id, body: typeof rec.body === 'string' ? rec.body : '' }]
  })
}

function text(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function dealAmount(deal: ProjectDiffInput['deal']) {
  const currency = deal.currency || 'BRL'
  return `${fromCents(toCents(deal.amount))} ${currency}`
}

function commentChanges(prev: unknown, next: unknown): AuditChange[] {
  const before = new Map(commentsOf(prev).map((c) => [c.id, c.body]))
  const after = commentsOf(next)
  const afterIds = new Set(after.map((c) => c.id))
  const changes: AuditChange[] = []

  for (const comment of after) {
    if (!before.has(comment.id)) {
      changes.push({ field: 'comment.created', from: '', to: comment.body })
      continue
    }
    add(changes, 'comment.edited', before.get(comment.id)!, comment.body)
  }
  for (const [id, body] of before) {
    if (!afterIds.has(id)) {
      changes.push({ field: 'comment.deleted', from: body, to: '' })
    }
  }
  return changes
}

function kanbanAction(changes: AuditChange[]) {
  const fields = new Set(changes.map((c) => c.field))
  if (fields.size === 1 && fields.has('status')) return 'kanban.move'
  if (fields.size === 1 && fields.has('description')) return 'kanban.update'
  const commentFields = [...fields]
  if (commentFields.every((f) => f.startsWith('comment.'))) {
    if (commentFields.every((f) => f === 'comment.created')) return 'kanban.comment.create'
    if (commentFields.every((f) => f === 'comment.edited')) return 'kanban.comment.edit'
    if (commentFields.every((f) => f === 'comment.deleted')) return 'kanban.comment.delete'
  }
  return 'kanban.update'
}

function toolChanges(prev: ProjectToolInput[], next: ProjectToolInput[]): AuditChange[] {
  const before = new Map(prev.map((tool) => [tool.id, tool]))
  const afterIds = new Set(next.map((tool) => tool.id))
  const changes: AuditChange[] = []

  for (const tool of next) {
    const prevTool = before.get(tool.id)
    if (!prevTool) {
      changes.push({ field: `tool.${tool.id}`, from: '', to: tool.name })
      continue
    }
    add(changes, `tool.${tool.id}.account`, text(prevTool.account), text(tool.account))
    add(changes, `tool.${tool.id}.billing`, billingSnapshot(prevTool), billingSnapshot(tool))
    secretChanges(changes, tool.id, prevTool.secrets, tool.secrets)
  }
  for (const tool of prev) {
    if (!afterIds.has(tool.id)) {
      changes.push({ field: `tool.${tool.id}`, from: tool.name, to: '' })
    }
  }
  return changes
}

function billingSnapshot(tool: ProjectToolInput) {
  if (!tool.billing) return ''
  const currency = tool.billing.currency || 'BRL'
  return `${tool.billing.amount} ${currency} ${tool.billing.cycle}`
}

function secretChanges(
  changes: AuditChange[],
  toolId: string,
  prev: { key: string; value?: string }[],
  next: { key: string; value?: string }[],
) {
  const before = new Set(prev.map((s) => s.key))
  const afterKeys = new Set(next.map((s) => s.key))

  for (const secret of next) {
    const field = `tool.${toolId}.secret.${secret.key}`
    if (!before.has(secret.key)) {
      if (secret.value) changes.push({ field, from: '', to: 'set' })
      continue
    }
    if (secret.value) add(changes, field, 'set', 'changed')
  }
  for (const secret of prev) {
    if (!afterKeys.has(secret.key)) {
      changes.push({ field: `tool.${toolId}.secret.${secret.key}`, from: 'set', to: '' })
    }
  }
}

export function diffProject(prev: ProjectDiffInput, next: ProjectDiffInput): DiffEntry[] {
  const projectChanges: AuditChange[] = []
  add(projectChanges, 'name', prev.name, next.name)
  add(projectChanges, 'clientId', prev.clientId, next.clientId)
  add(projectChanges, 'startedAt', prev.startedAt, next.startedAt)
  add(projectChanges, 'endedAt', text(prev.endedAt), text(next.endedAt))
  add(projectChanges, 'repo', prev.repo?.fullName ?? '', next.repo?.fullName ?? '')
  add(projectChanges, 'deal.kind', prev.deal.kind, next.deal.kind)
  add(projectChanges, 'deal.amount', dealAmount(prev.deal), dealAmount(next.deal))
  add(
    projectChanges,
    'deal.installments',
    String(prev.deal.installments ?? ''),
    String(next.deal.installments ?? ''),
  )
  projectChanges.push(...toolChanges(prev.tools, next.tools))

  const kanbanChanges: AuditChange[] = []
  add(kanbanChanges, 'status', prev.status, next.status)
  add(kanbanChanges, 'description', text(prev.description), text(next.description))
  kanbanChanges.push(...commentChanges(prev.comments, next.comments))

  const entries: DiffEntry[] = []
  if (projectChanges.length) {
    entries.push({ module: 'project', action: 'project.update', changes: projectChanges })
  }
  if (kanbanChanges.length) {
    entries.push({ module: 'kanban', action: kanbanAction(kanbanChanges), changes: kanbanChanges })
  }
  return entries
}
