import type { AuditChange } from 'shared'

import i18n, { getLocale } from '../../i18n/index.ts'
import { auditActionLabel, auditFieldLabel, dash, statusLabel } from '../../i18n/labels.ts'

export function formatAuditChange(
  change: AuditChange,
  clientName?: (id: string) => string,
): string {
  if (change.field === 'description') return i18n.t('audit.change.descriptionUpdated')
  if (change.field === 'status') {
    return i18n.t('audit.change.status', {
      from: statusLabel(change.from),
      to: statusLabel(change.to),
    })
  }
  if (change.field === 'comment.created') return i18n.t('audit.change.commentAdded')
  if (change.field === 'comment.edited') return i18n.t('audit.change.commentEdited')
  if (change.field === 'comment.deleted') return i18n.t('audit.change.commentDeleted')

  const secret = change.field.match(/^tool\.[^.]+\.secret\.(.+)$/)
  if (secret) {
    const key = secret[1]
    if (!change.from) return i18n.t('audit.change.secretSet', { key })
    if (!change.to) return i18n.t('audit.change.secretRemoved', { key })
    return i18n.t('audit.change.secretUpdated', { key })
  }

  const toolField = change.field.match(/^tool\.([^.]+)(?:\.(account|billing))?$/)
  if (toolField) {
    if (toolField[2] === 'account') {
      return i18n.t('audit.change.account', {
        from: change.from || dash(),
        to: change.to || dash(),
      })
    }
    if (toolField[2] === 'billing') {
      return i18n.t('audit.change.billing', {
        from: change.from || dash(),
        to: change.to || dash(),
      })
    }
    if (!change.from) return i18n.t('audit.change.toolAdded', { name: change.to })
    if (!change.to) return i18n.t('audit.change.toolRemoved', { name: change.from })
  }

  const from =
    change.field === 'clientId' ? (clientName?.(change.from) ?? change.from) : change.from
  const to = change.field === 'clientId' ? (clientName?.(change.to) ?? change.to) : change.to
  return i18n.t('audit.change.field', {
    label: auditFieldLabel(change.field),
    from: from || dash(),
    to: to || dash(),
  })
}

export function formatAuditAt(iso: string) {
  return new Date(iso).toLocaleString(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatAuditDetails(
  changes: AuditChange[],
  action: string,
  clientName?: (id: string) => string,
) {
  if (changes.length === 0) return auditActionLabel(action)
  const shown = changes.slice(0, 2).map((change) => formatAuditChange(change, clientName))
  const extra = changes.length - shown.length
  return extra > 0 ? `${shown.join(' · ')} · +${extra}` : shown.join(' · ')
}
