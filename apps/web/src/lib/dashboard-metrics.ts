/**
 * Every number the dashboard shows is computed here. Pure functions, no React,
 * no formatting — the components decide how to draw, this decides what is true.
 *
 * Relative imports (not the "@/" alias) on purpose: the self-check runs on
 * `node --experimental-strip-types`, and Node does not resolve the alias.
 */
import type { BillingCycle, Payer, Project, Tool } from "../data/projects.ts"
import type { ToolCategory } from "../data/tool-catalog.ts"
import { DEFAULT_CURRENCY } from "./currency.ts"
import { addMonths, monthOf, monthRange, todayIso } from "./dates.ts"
import { effectiveMonth } from "./invoice-table.ts"
import { generateInvoices } from "./invoices.ts"

export type DashboardFilters = {
  /** "YYYY-MM", empty = no lower bound. */
  monthFrom: string
  /** "YYYY-MM", empty = no upper bound. */
  monthTo: string
  /** "" = every project. */
  projectId: string
  /** "" = every client. */
  clientId: string
  /** ISO 4217. Values in other currencies are excluded, never converted. */
  currency: string
}

export const emptyFilters: DashboardFilters = {
  monthFrom: "",
  monthTo: "",
  projectId: "",
  clientId: "",
  currency: DEFAULT_CURRENCY,
}

export function dealCurrency(project: Project): string {
  return project.deal.currency ?? DEFAULT_CURRENCY
}

export function toolCurrency(tool: Tool): string {
  return tool.billing?.currency ?? DEFAULT_CURRENCY
}

/** Last month the project's tools are still on the meter. */
function lastActiveMonth(project: Project): string | null {
  return project.endedAt ? monthOf(project.endedAt) : null
}

/**
 * Widest month span the data occupies — the earliest project start through the
 * latest thing that happens (last installment or project end), never narrower
 * than today. This is what "Tudo" means in the period filter.
 */
export function dataRange(projects: Project[]): { from: string; to: string } {
  const today = monthOf(todayIso())
  if (projects.length === 0) return { from: today, to: today }

  let from = monthOf(projects[0].startedAt)
  let to = today

  for (const project of projects) {
    const start = monthOf(project.startedAt)
    if (start < from) from = start
    if (start > to) to = start

    const end = lastActiveMonth(project)
    if (end && end > to) to = end

    for (const invoice of generateInvoices(project, "")) {
      const month = effectiveMonth(invoice)
      if (month > to) to = month
    }
  }

  return { from, to }
}

/** The months every temporal chart shares as its x-axis. */
export function resolveMonths(projects: Project[], filters: DashboardFilters): string[] {
  const range = dataRange(projects)
  const from = filters.monthFrom || range.from
  const to = filters.monthTo || range.to
  return monthRange(from, to)
}

/** Project/client filter only — currency is applied per value, deal by deal. */
export function applyFilters(projects: Project[], filters: DashboardFilters): Project[] {
  return projects.filter((project) => {
    if (filters.projectId && project.id !== filters.projectId) return false
    if (filters.clientId && project.clientId !== filters.clientId) return false
    return true
  })
}

/** Currencies actually present in the data, so the filter never offers an empty one. */
export function availableCurrencies(projects: Project[]): string[] {
  const currencies = new Set<string>([DEFAULT_CURRENCY])
  for (const project of projects) {
    currencies.add(dealCurrency(project))
    for (const tool of project.tools) {
      if (tool.billing) currencies.add(toolCurrency(tool))
    }
  }
  return [...currencies].sort()
}

// ---------------------------------------------------------------- revenue

export type RevenueMonth = {
  month: string
  recebido: number
  aReceber: number
  atrasado: number
}

/**
 * Invoices bucketed into the month they belong to. An invoice outside the range
 * is dropped, not clamped — clamping would pile months of history onto the
 * first bar and invent a spike that never happened.
 */
export function revenueByMonth(
  projects: Project[],
  months: string[],
  currency: string
): RevenueMonth[] {
  const buckets = new Map<string, RevenueMonth>(
    months.map((month) => [month, { month, recebido: 0, aReceber: 0, atrasado: 0 }])
  )

  for (const project of projects) {
    if (dealCurrency(project) !== currency) continue
    for (const invoice of generateInvoices(project, "")) {
      const bucket = buckets.get(effectiveMonth(invoice))
      if (!bucket) continue
      if (invoice.status === "paid") bucket.recebido += invoice.amount
      else if (invoice.status === "overdue") bucket.atrasado += invoice.amount
      else bucket.aReceber += invoice.amount
    }
  }

  return months.map((month) => buckets.get(month)!)
}

// ------------------------------------------------------------------ costs

/**
 * A tool's recurring cost expressed per month, so a yearly plan and a monthly
 * one can sit in the same bar. One-off charges are not recurring and return 0 —
 * they only land on the single month they are billed (see `toolCostInMonth`).
 */
export function monthlyToolCost(tool: Tool): number {
  const { billing } = tool
  if (!billing) return 0
  if (billing.cycle === "monthly") return billing.amount
  if (billing.cycle === "yearly") return billing.amount / 12
  return 0
}

/** What a tool costs in one specific month, respecting the project's lifespan. */
export function toolCostInMonth(tool: Tool, project: Project, month: string): number {
  const { billing } = tool
  if (!billing) return 0
  if (month < monthOf(project.startedAt)) return 0
  const end = lastActiveMonth(project)
  if (end && month > end) return 0
  if (billing.cycle === "one-off") {
    return monthOf(billing.nextInvoice) === month ? billing.amount : 0
  }
  return monthlyToolCost(tool)
}

/** Total the freelancer pays out of pocket for a project across the range. */
function ownCostOverRange(project: Project, months: string[], currency: string): number {
  let total = 0
  for (const tool of project.tools) {
    if (tool.billing?.payer !== "me") continue
    if (toolCurrency(tool) !== currency) continue
    for (const month of months) total += toolCostInMonth(tool, project, month)
  }
  return total
}

// ----------------------------------------------------------------- profit

export type ProjectProfit = {
  projectId: string
  name: string
  receita: number
  custo: number
  lucro: number
  /** 0–1. Zero revenue means zero margin, not a division by zero. */
  margem: number
}

/**
 * Profit only ever subtracts tools with `payer === "me"`. What the client pays
 * for is their cost, not the freelancer's — it shows up in the tools tab and
 * never here.
 */
export function profitByProject(
  projects: Project[],
  months: string[],
  currency: string
): ProjectProfit[] {
  const monthSet = new Set(months)

  return projects
    .filter((project) => dealCurrency(project) === currency)
    .map((project) => {
      const receita = generateInvoices(project, "")
        .filter((invoice) => monthSet.has(effectiveMonth(invoice)))
        .reduce((total, invoice) => total + invoice.amount, 0)
      const custo = ownCostOverRange(project, months, currency)
      const lucro = receita - custo
      return {
        projectId: project.id,
        name: project.name,
        receita,
        custo,
        lucro,
        margem: receita > 0 ? lucro / receita : 0,
      }
    })
    .sort((a, b) => b.lucro - a.lucro)
}

// ---------------------------------------------------------------- clients

export type ClientMonth = { month: string; clientes: number; novos: number }

/**
 * Client acquisition read off the projects: a client "arrives" on their first
 * project. No date on `Contact` to read instead, and inventing one would put a
 * client on the chart before there was any work for them.
 */
export function clientGrowth(projects: Project[], months: string[]): ClientMonth[] {
  const firstMonthByClient = new Map<string, string>()
  for (const project of projects) {
    const month = monthOf(project.startedAt)
    const current = firstMonthByClient.get(project.clientId)
    if (!current || month < current) firstMonthByClient.set(project.clientId, month)
  }

  const arrivals = [...firstMonthByClient.values()]

  return months.map((month) => ({
    month,
    clientes: arrivals.filter((arrival) => arrival <= month).length,
    novos: arrivals.filter((arrival) => arrival === month).length,
  }))
}

// ------------------------------------------------------------------ tools

export type ToolCost = {
  /** Tool id + name: the same catalog id can carry a custom name per project. */
  key: string
  name: string
  category: ToolCategory
  eu: number
  cliente: number
  total: number
  projetos: string[]
}

export function toolCostByTool(
  projects: Project[],
  months: string[],
  currency: string
): ToolCost[] {
  const byKey = new Map<string, ToolCost>()

  for (const project of projects) {
    for (const tool of project.tools) {
      if (!tool.billing) continue
      if (toolCurrency(tool) !== currency) continue
      const total = months.reduce(
        (sum, month) => sum + toolCostInMonth(tool, project, month),
        0
      )
      if (total === 0) continue

      const key = `${tool.id}-${tool.name}`
      const entry = byKey.get(key) ?? {
        key,
        name: tool.name,
        category: tool.category,
        eu: 0,
        cliente: 0,
        total: 0,
        projetos: [],
      }
      if (tool.billing.payer === "me") entry.eu += total
      else entry.cliente += total
      entry.total += total
      if (!entry.projetos.includes(project.name)) entry.projetos.push(project.name)
      byKey.set(key, entry)
    }
  }

  return [...byKey.values()].sort((a, b) => b.total - a.total)
}

/**
 * Categories folded onto the 6 chart slots. The mapping is **fixed by
 * category**, never by rank: filtering must not repaint the categories that
 * survive. The four that don't get their own slot share "other" — a freelance
 * dev's recurring spend concentrates in the first five.
 */
export const CATEGORY_SLOT: Record<ToolCategory, number> = {
  deploy: 1,
  database: 2,
  observability: 3,
  analytics: 4,
  communication: 5,
  payments: 6,
  ai: 6,
  other: 6,
}

export type CategoryCost = { key: string; slot: number; total: number }

export function toolCostByCategory(
  projects: Project[],
  months: string[],
  currency: string
): CategoryCost[] {
  const byKey = new Map<string, CategoryCost>()

  for (const { category, total } of toolCostByTool(projects, months, currency)) {
    const slot = CATEGORY_SLOT[category]
    // everything on slot 6 collapses into a single "other" bucket
    const key = slot === 6 ? "other" : category
    const entry = byKey.get(key) ?? { key, slot, total: 0 }
    entry.total += total
    byKey.set(key, entry)
  }

  return [...byKey.values()].sort((a, b) => b.total - a.total)
}

export type CostMonth = { month: string; eu: number; cliente: number }

export function toolCostByMonth(
  projects: Project[],
  months: string[],
  currency: string
): CostMonth[] {
  return months.map((month) => {
    const bucket: CostMonth = { month, eu: 0, cliente: 0 }
    for (const project of projects) {
      for (const tool of project.tools) {
        if (!tool.billing) continue
        if (toolCurrency(tool) !== currency) continue
        const cost = toolCostInMonth(tool, project, month)
        if (tool.billing.payer === "me") bucket.eu += cost
        else bucket.cliente += cost
      }
    }
    return bucket
  })
}

export type ToolRow = {
  /** Unique per project+tool — the table's row key. */
  id: string
  /** Catalog id, kept apart from `id` so the icon lookup never has to parse it. */
  toolId: string
  name: string
  category: ToolCategory
  projectId: string
  projectName: string
  account: string
  cycle: BillingCycle
  amount: number
  monthly: number
  payer: Payer
  currency: string
}

/** One row per tool per project — the table view behind the cost charts. */
export function toolRows(projects: Project[], currency: string): ToolRow[] {
  const rows: ToolRow[] = []
  for (const project of projects) {
    for (const tool of project.tools) {
      if (!tool.billing) continue
      if (toolCurrency(tool) !== currency) continue
      rows.push({
        id: `${project.id}-${tool.id}-${tool.name}`,
        toolId: tool.id,
        name: tool.name,
        category: tool.category,
        projectId: project.id,
        projectName: project.name,
        account: tool.account ?? "—",
        cycle: tool.billing.cycle,
        amount: tool.billing.amount,
        monthly: monthlyToolCost(tool),
        payer: tool.billing.payer,
        currency: toolCurrency(tool),
      })
    }
  }
  return rows
}

// --------------------------------------------------------------- summaries

export type FinanceSummary = {
  faturado: number
  recebido: number
  aReceber: number
  atrasado: number
  custo: number
  lucro: number
  margem: number
  clientes: number
  projetos: number
  /** Projects skipped because their deal is in another currency. */
  foraDaMoeda: number
}

export function financeSummary(
  projects: Project[],
  months: string[],
  currency: string
): FinanceSummary {
  const revenue = revenueByMonth(projects, months, currency)
  const recebido = revenue.reduce((total, month) => total + month.recebido, 0)
  const aReceber = revenue.reduce((total, month) => total + month.aReceber, 0)
  const atrasado = revenue.reduce((total, month) => total + month.atrasado, 0)
  const faturado = recebido + aReceber + atrasado

  const inCurrency = projects.filter((project) => dealCurrency(project) === currency)
  const custo = inCurrency.reduce(
    (total, project) => total + ownCostOverRange(project, months, currency),
    0
  )
  const lucro = faturado - custo
  const lastMonth = months[months.length - 1] ?? ""
  const active = inCurrency.filter((project) => monthOf(project.startedAt) <= lastMonth)

  return {
    faturado,
    recebido,
    aReceber,
    atrasado,
    custo,
    lucro,
    margem: faturado > 0 ? lucro / faturado : 0,
    clientes: new Set(active.map((project) => project.clientId)).size,
    projetos: active.length,
    foraDaMoeda: projects.length - inCurrency.length,
  }
}

export type ToolsSummary = {
  /** Everything the tools cost across the whole range. */
  totalPeriodo: number
  eu: number
  cliente: number
  /** Recurring cost of the last month in the range — the current run rate. */
  runRate: number
  pagas: number
  gratis: number
  maisCara: ToolCost | null
  /** Paid tools skipped because they bill in another currency. */
  foraDaMoeda: number
}

export function toolsSummary(
  projects: Project[],
  months: string[],
  currency: string
): ToolsSummary {
  const costs = toolCostByTool(projects, months, currency)
  const byMonth = toolCostByMonth(projects, months, currency)
  const last = byMonth[byMonth.length - 1]

  let pagas = 0
  let gratis = 0
  let foraDaMoeda = 0
  for (const project of projects) {
    for (const tool of project.tools) {
      if (!tool.billing) gratis += 1
      else if (toolCurrency(tool) === currency) pagas += 1
      else foraDaMoeda += 1
    }
  }

  return {
    totalPeriodo: costs.reduce((total, tool) => total + tool.total, 0),
    eu: costs.reduce((total, tool) => total + tool.eu, 0),
    cliente: costs.reduce((total, tool) => total + tool.cliente, 0),
    runRate: last ? last.eu + last.cliente : 0,
    pagas,
    gratis,
    maisCara: costs[0] ?? null,
    foraDaMoeda,
  }
}

/**
 * The same window, shifted back by its own length — what "vs. previous period"
 * on the hero figure compares against.
 */
export function previousMonths(months: string[]): string[] {
  if (months.length === 0) return []
  const to = addMonths(months[0], -1)
  const from = addMonths(to, -(months.length - 1))
  return monthRange(from, to)
}
