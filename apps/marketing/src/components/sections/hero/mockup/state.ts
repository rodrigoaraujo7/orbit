export const STATUSES = ["queued", "in-development", "in-validation", "completed"] as const
export type Status = (typeof STATUSES)[number]

export type InvoiceStatus = "paid" | "pending" | "overdue"
export const INVOICE_STATUSES: InvoiceStatus[] = ["paid", "pending", "overdue"]

export type Workflow = "success" | "failure" | "running"

export const VIEWS = ["dashboard", "projects", "kanban", "audit"] as const
export type View = (typeof VIEWS)[number]

/** Month indexes (0 = January) of the six-month period every chart covers. */
export const MONTHS = [3, 4, 5, 6, 7, 8] as const
export const MONTHS_YEAR = 2026

export type Tool = { name: string; monthlyCost: number }

export type Project = {
  id: string
  name: string
  client: string
  status: Status
  deal: "upfront" | "installment"
  /** Amount of each invoice. */
  installment: number
  /** One slot per period month; `null` means nothing is due that month. */
  invoices: (InvoiceStatus | null)[]
  tools: Tool[]
  repo: { fullName: string; workflow: Workflow } | null
}

export type AuditModule = "project" | "kanban" | "settings" | "security"
export type AuditAction =
  "statusChanged" | "invoiceStatus" | "projectCreated" | "toolCreated" | "contactCreated" | "login"

export type AuditEntry = {
  id: number
  module: AuditModule
  action: AuditAction
  object: string | null
  at: number
  change?: { from: Status; to: Status }
}

export type MockupState = {
  projects: Project[]
  audit: AuditEntry[]
}

export type MockupAction = { type: "move"; id: string; status: Status; at: number }

function at(day: number, hour: number, minute: number) {
  return new Date(MONTHS_YEAR, 8, day, hour, minute).getTime()
}

export function initialState(): MockupState {
  return {
    projects: [
      {
        id: "atlas",
        name: "Atlas storefront",
        client: "Lumen Coffee",
        status: "in-development",
        deal: "installment",
        installment: 4200,
        invoices: ["paid", "paid", "paid", "paid", "pending", "pending"],
        tools: [
          { name: "Vercel", monthlyCost: 20 },
          { name: "Supabase", monthlyCost: 25 },
        ],
        repo: { fullName: "lumen/atlas-storefront", workflow: "success" },
      },
      {
        id: "orbit",
        name: "Orbit mobile app",
        client: "Kite Labs",
        status: "in-development",
        deal: "installment",
        installment: 5400,
        invoices: [null, "paid", "paid", "paid", "paid", "pending"],
        tools: [
          { name: "Expo", monthlyCost: 19 },
          { name: "Sentry", monthlyCost: 0 },
        ],
        repo: { fullName: "kitelabs/orbit", workflow: "running" },
      },
      {
        id: "harbor",
        name: "Harbor CRM",
        client: "Northwind",
        status: "in-validation",
        deal: "installment",
        installment: 3100,
        invoices: ["paid", "paid", "paid", "overdue", "pending", "pending"],
        tools: [
          { name: "Supabase", monthlyCost: 25 },
          { name: "Resend", monthlyCost: 0 },
        ],
        repo: { fullName: "northwind/harbor-crm", workflow: "failure" },
      },
      {
        id: "pulse",
        name: "Pulse analytics",
        client: "Brightline",
        status: "queued",
        deal: "upfront",
        installment: 9000,
        invoices: [null, null, null, null, null, "pending"],
        tools: [{ name: "PostHog", monthlyCost: 0 }],
        repo: null,
      },
      {
        id: "relay",
        name: "Relay API",
        client: "Northwind",
        status: "queued",
        deal: "installment",
        installment: 2200,
        invoices: [null, null, null, null, "pending", "pending"],
        tools: [{ name: "Railway", monthlyCost: 5 }],
        repo: { fullName: "northwind/relay-api", workflow: "success" },
      },
      {
        id: "fern",
        name: "Fern docs site",
        client: "Greenhouse",
        status: "completed",
        deal: "upfront",
        installment: 6000,
        invoices: ["paid", null, null, null, null, null],
        tools: [{ name: "Vercel", monthlyCost: 0 }],
        repo: { fullName: "greenhouse/fern-docs", workflow: "success" },
      },
    ],
    audit: [
      {
        id: 6,
        module: "kanban",
        action: "statusChanged",
        object: "Harbor CRM",
        at: at(29, 10, 42),
        change: { from: "in-development", to: "in-validation" },
      },
      {
        id: 5,
        module: "project",
        action: "invoiceStatus",
        object: "Orbit mobile app",
        at: at(29, 9, 15),
      },
      { id: 4, module: "security", action: "login", object: null, at: at(29, 9, 2) },
      { id: 3, module: "settings", action: "toolCreated", object: "PostHog", at: at(28, 17, 30) },
      {
        id: 2,
        module: "project",
        action: "projectCreated",
        object: "Relay API",
        at: at(27, 14, 8),
      },
      {
        id: 1,
        module: "settings",
        action: "contactCreated",
        object: "Northwind",
        at: at(27, 13, 55),
      },
    ],
  }
}

export function mockupReducer(state: MockupState, action: MockupAction): MockupState {
  const project = state.projects.find((item) => item.id === action.id)
  if (!project || project.status === action.status) return state
  const nextId = state.audit.reduce((max, entry) => Math.max(max, entry.id), 0) + 1
  return {
    projects: state.projects.map((item) =>
      item.id === action.id ? { ...item, status: action.status } : item,
    ),
    audit: [
      {
        id: nextId,
        module: "kanban",
        action: "statusChanged",
        object: project.name,
        at: action.at,
        change: { from: project.status, to: action.status },
      },
      ...state.audit,
    ],
  }
}

export type RevenueMonth = Record<InvoiceStatus, number>

export type Metrics = {
  billed: number
  received: number
  receivable: number
  overdue: number
  toolCost: number
  margin: number
  projects: number
  clients: number
  revenueByMonth: RevenueMonth[]
  clientGrowth: number[]
  profits: { name: string; profit: number }[]
}

function billedOf(project: Project) {
  return project.invoices.filter(Boolean).length * project.installment
}

function toolCostOf(project: Project) {
  return project.tools.reduce((total, tool) => total + tool.monthlyCost, 0) * MONTHS.length
}

export function metrics(projects: Project[]): Metrics {
  const sumWhere = (status: InvoiceStatus) =>
    projects.reduce(
      (total, project) =>
        total +
        project.invoices.filter((invoice) => invoice === status).length * project.installment,
      0,
    )
  const billed = projects.reduce((total, project) => total + billedOf(project), 0)
  const toolCost = projects.reduce((total, project) => total + toolCostOf(project), 0)

  const firstMonth = new Map<string, number>()
  for (const project of projects) {
    const start = project.invoices.findIndex(Boolean)
    const known = firstMonth.get(project.client)
    if (known === undefined || start < known) firstMonth.set(project.client, start)
  }

  return {
    billed,
    received: sumWhere("paid"),
    receivable: sumWhere("pending"),
    overdue: sumWhere("overdue"),
    toolCost,
    margin: billed === 0 ? 0 : (billed - toolCost) / billed,
    projects: projects.length,
    clients: firstMonth.size,
    revenueByMonth: MONTHS.map((_, month) => {
      const totals: RevenueMonth = { paid: 0, pending: 0, overdue: 0 }
      for (const project of projects) {
        const invoice = project.invoices[month]
        if (invoice) totals[invoice] += project.installment
      }
      return totals
    }),
    clientGrowth: MONTHS.map(
      (_, month) => [...firstMonth.values()].filter((start) => start <= month).length,
    ),
    profits: projects
      .map((project) => ({ name: project.name, profit: billedOf(project) - toolCostOf(project) }))
      .sort((a, b) => b.profit - a.profit),
  }
}
