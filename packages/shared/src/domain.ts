import { z } from 'zod'

export const projectStatusSchema = z.enum([
  'queued',
  'in-development',
  'paused',
  'in-validation',
  'completed',
])
export type ProjectStatus = z.infer<typeof projectStatusSchema>

export const dealKindSchema = z.enum(['upfront', 'installment'])
export type DealKind = z.infer<typeof dealKindSchema>

export const billingCycleSchema = z.enum(['monthly', 'yearly', 'one-off'])
export type BillingCycle = z.infer<typeof billingCycleSchema>

export const payerSchema = z.enum(['me', 'client'])
export type Payer = z.infer<typeof payerSchema>

export const invoiceStatusSchema = z.enum(['pending', 'paid', 'overdue'])
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

export const paymentMethodSchema = z.enum(['boleto', 'pix'])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const workflowStatusSchema = z.enum(['success', 'failure', 'running', 'none'])
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>
