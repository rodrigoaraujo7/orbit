import { z } from "zod"
import { auditModuleSchema } from "./audit.ts"
import { invoiceStatusSchema, projectStatusSchema, workflowStatusSchema } from "./domain.ts"

const optionalString = z.string().trim().optional()

export const projectListFiltersSchema = z.object({
  q: optionalString,
  status: projectStatusSchema.optional(),
  workflow: workflowStatusSchema.optional(),
  clientId: optionalString,
  monthFrom: optionalString,
  monthTo: optionalString,
})
export type ProjectListFilters = z.infer<typeof projectListFiltersSchema>

export const dashboardFiltersSchema = z.object({
  monthFrom: optionalString,
  monthTo: optionalString,
  projectId: optionalString,
  clientId: optionalString,
  currency: optionalString,
})
export type DashboardFilterInput = z.infer<typeof dashboardFiltersSchema>

export const invoiceListFiltersSchema = z.object({
  projectId: z.string().min(1),
  status: z.union([z.literal("all"), invoiceStatusSchema]).optional(),
  monthFrom: optionalString,
  monthTo: optionalString,
})
export type InvoiceListFilters = z.infer<typeof invoiceListFiltersSchema>

export const auditPeriodSchema = z.enum(["today", "7d", "30d", "90d", "all", "custom"])
export type AuditPeriod = z.infer<typeof auditPeriodSchema>

/** URL search for `/projects`. */
export const projectsSearchSchema = z.object({
  q: optionalString,
  status: projectStatusSchema.optional(),
  workflow: workflowStatusSchema.optional(),
})
export type ProjectsSearch = z.infer<typeof projectsSearchSchema>

/** URL search for `/kanban`. */
export const kanbanSearchSchema = z.object({
  q: optionalString,
  client: optionalString,
  from: optionalString,
  to: optionalString,
})
export type KanbanSearch = z.infer<typeof kanbanSearchSchema>

/** URL search for `/dashboard`. */
export const dashboardSearchSchema = z.object({
  from: optionalString,
  to: optionalString,
  client: optionalString,
  project: optionalString,
  currency: optionalString,
})
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>

/** URL search for invoice filters on `/projects/$projectId`. */
export const invoiceSearchSchema = z.object({
  status: z.union([z.literal("all"), invoiceStatusSchema]).optional(),
  from: optionalString,
  to: optionalString,
})
export type InvoiceSearch = z.infer<typeof invoiceSearchSchema>

/** URL search for `/audit`. */
export const auditSearchSchema = z.object({
  q: optionalString,
  module: auditModuleSchema.optional(),
  period: auditPeriodSchema.optional(),
  from: optionalString,
  to: optionalString,
})
export type AuditSearch = z.infer<typeof auditSearchSchema>

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}

/** Drop empty strings so filter tweaks do not pollute the URL. */
export function compactSearch<T extends Record<string, unknown>>(search: T): Partial<T> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(search)) {
    if (isBlank(value)) continue
    next[key] = value
  }
  return next as Partial<T>
}

/**
 * TanStack `validateSearch`: keep known keys, treat empty strings as absent,
 * and fall back to schema defaults when the URL is garbage.
 */
export function parseSearch<S extends z.ZodType>(schema: S, search: unknown): z.infer<S> {
  const raw = typeof search === "object" && search !== null ? { ...(search as Record<string, unknown>) } : {}
  for (const [key, value] of Object.entries(raw)) {
    if (isBlank(value)) delete raw[key]
  }
  const result = schema.safeParse(raw)
  if (result.success) return result.data
  return schema.parse({})
}
