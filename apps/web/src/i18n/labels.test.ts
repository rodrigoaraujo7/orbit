import { describe, expect, it } from 'vitest'
import {
  AUDIT_MODULES,
  auditActionLabel,
  auditFieldLabel,
  auditModuleLabel,
  auditModuleOptions,
  billingCycleLabel,
  billingCycleOptions,
  categoryCostLabel,
  dash,
  dealKindLabel,
  dealKindOptions,
  freeLabel,
  invoiceStatusLabel,
  payerLabel,
  payerOptions,
  paymentMethodLabel,
  statusLabel,
  toolCategoryLabel,
  toolCategoryOptions,
  workflowStatusLabel,
  workflowStatusTooltip,
} from './labels.ts'

describe('labels', () => {
  it('translates enums and falls back for unknown audit keys', () => {
    expect(statusLabel('queued')).toBeTruthy()
    expect(statusLabel('not-a-status')).toBe('not-a-status')
    expect(dealKindLabel('upfront')).toBeTruthy()
    expect(freeLabel()).toBeTruthy()
    expect(invoiceStatusLabel('paid')).toBeTruthy()
    expect(paymentMethodLabel('pix')).toBeTruthy()
    expect(billingCycleLabel('monthly')).toBeTruthy()
    expect(payerLabel('me')).toBeTruthy()
    expect(workflowStatusLabel('success')).toBeTruthy()
    expect(workflowStatusTooltip('failure')).toBeTruthy()
    expect(toolCategoryLabel('deploy')).toBeTruthy()
    expect(categoryCostLabel('other')).toBeTruthy()
    expect(categoryCostLabel('deploy')).toBe(toolCategoryLabel('deploy'))
    expect(AUDIT_MODULES).toContain('security')
    expect(auditModuleLabel('kanban')).toBeTruthy()
    expect(auditActionLabel('security.login.failed')).not.toBe('security.login.failed')
    expect(auditActionLabel('totally.unknown')).toBe('totally.unknown')
    expect(auditFieldLabel('name')).not.toBe('name')
    expect(auditFieldLabel('notAField')).toBe('notAField')
    expect(dash()).toBeTruthy()
    expect(dealKindOptions()).toHaveLength(2)
    expect(billingCycleOptions()).toHaveLength(3)
    expect(payerOptions()).toHaveLength(2)
    expect(toolCategoryOptions().at(-1)?.value).toBe('other')
    expect(auditModuleOptions()[0]).toEqual({ value: '', label: expect.any(String) })
  })
})
