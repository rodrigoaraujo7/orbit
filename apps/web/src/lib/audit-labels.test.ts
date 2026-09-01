import { describe, expect, it } from 'vitest'
import { formatAuditAt, formatAuditChange, formatAuditDetails } from './audit-labels.ts'
import { dash } from '../i18n/labels.ts'

describe('audit-labels', () => {
  it('describes every change kind', () => {
    expect(formatAuditChange({ field: 'description', from: '', to: 'x' })).toBeTruthy()
    expect(formatAuditChange({ field: 'status', from: 'queued', to: 'paused' })).toBeTruthy()
    expect(formatAuditChange({ field: 'comment.created', from: '', to: 'hi' })).toBeTruthy()
    expect(formatAuditChange({ field: 'comment.edited', from: 'a', to: 'b' })).toBeTruthy()
    expect(formatAuditChange({ field: 'comment.deleted', from: 'a', to: '' })).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws.secret.TOKEN', from: '', to: 'set' })).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws.secret.TOKEN', from: 'set', to: '' })).toBeTruthy()
    expect(
      formatAuditChange({ field: 'tool.aws.secret.TOKEN', from: 'set', to: 'changed' }),
    ).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws.account', from: '', to: 'me' })).toContain(dash())
    expect(formatAuditChange({ field: 'tool.aws.billing', from: 'a', to: 'b' })).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws.billing', from: 'a', to: '' })).toContain(dash())
    expect(formatAuditChange({ field: 'tool.aws', from: '', to: 'AWS' })).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws', from: 'AWS', to: '' })).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws', from: 'AWS', to: 'Amazon' })).toBeTruthy()
    expect(formatAuditChange({ field: 'tool.aws.account', from: 'a', to: '' })).toContain(dash())
    expect(formatAuditChange({ field: 'tool.aws.billing', from: '', to: 'b' })).toContain(dash())
    expect(
      formatAuditChange({ field: 'clientId', from: 'c1', to: 'c2' }, (id) => `name-${id}`),
    ).toContain('name-c1')
    expect(
      formatAuditChange(
        { field: 'clientId', from: 'c1', to: 'c2' },
        () => undefined as unknown as string,
      ),
    ).toContain('c1')
    expect(formatAuditChange({ field: 'clientId', from: '', to: '' })).toContain(dash())
    expect(formatAuditChange({ field: 'name', from: 'A', to: 'B' })).toBeTruthy()
    expect(
      formatAuditDetails([{ field: 'name', from: 'A', to: 'B' }], 'project.update', (id) => id),
    ).toBeTruthy()
  })

  it('formats timestamps and summaries', () => {
    expect(formatAuditAt('2026-08-10T14:32:00.000Z')).toMatch(/2026/)
    expect(formatAuditDetails([], 'project.create')).toBeTruthy()
    expect(
      formatAuditDetails(
        [
          { field: 'name', from: 'A', to: 'B' },
          { field: 'status', from: 'queued', to: 'paused' },
          { field: 'description', from: '', to: 'x' },
        ],
        'project.update',
      ),
    ).toContain('+1')
    expect(
      formatAuditDetails([{ field: 'name', from: 'A', to: 'B' }], 'project.update'),
    ).not.toContain('+')
  })
})
