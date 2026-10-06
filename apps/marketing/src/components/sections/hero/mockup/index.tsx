"use client"

import {
  CircleCheck,
  CircleX,
  Columns3,
  FolderGit2,
  LayoutDashboard,
  LoaderCircle,
  ScrollText,
  User,
} from "lucide-react"
import { useReducer, useRef, useState, type DragEvent, type ReactNode } from "react"
import { Badge } from "ui/badge"
import { cn } from "ui/utils"
import type { Dictionary, Locale } from "@/i18n"
import {
  initialState,
  INVOICE_STATUSES,
  metrics,
  mockupReducer,
  MONTHS,
  MONTHS_YEAR,
  STATUSES,
  VIEWS,
  type AuditEntry,
  type AuditModule,
  type InvoiceStatus,
  type Project,
  type Status,
  type View,
  type Workflow,
} from "./state"

type Copy = Dictionary["mockup"]
type BadgeVariant = "default" | "muted" | "outline" | "success" | "warning" | "destructive"

const VIEW_ICON: Record<View, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  projects: FolderGit2,
  kanban: Columns3,
  audit: ScrollText,
}

const STATUS_DOT: Record<Status, string> = {
  queued: "bg-muted-foreground",
  "in-development": "bg-primary",
  "in-validation": "bg-foreground/50",
  completed: "bg-success",
}

const STATUS_BADGE: Record<Status, BadgeVariant> = {
  queued: "muted",
  "in-development": "default",
  "in-validation": "outline",
  completed: "success",
}

const MODULE_BADGE: Record<AuditModule, BadgeVariant> = {
  project: "default",
  kanban: "outline",
  settings: "muted",
  security: "destructive",
}

const WORKFLOW_ICON: Record<Workflow, { icon: typeof CircleCheck; className: string }> = {
  success: { icon: CircleCheck, className: "text-success" },
  failure: { icon: CircleX, className: "text-destructive" },
  running: { icon: LoaderCircle, className: "animate-spin text-warning" },
}

const SERIES_FILL: Record<InvoiceStatus, string> = {
  paid: "bg-chart-1",
  pending: "bg-chart-2",
  overdue: "bg-chart-3",
}

const TICK_CLASS: Record<InvoiceStatus, string> = {
  paid: "bg-chart-1",
  pending: "border border-dashed border-chart-2 bg-chart-2/15",
  overdue:
    "bg-chart-3 [background-image:repeating-linear-gradient(45deg,transparent_0_3px,var(--background)_3px_4px)]",
}

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  )
}

function formatters(locale: Locale) {
  const intlLocale = locale === "pt-BR" ? "pt-BR" : "en-US"
  const currency = locale === "pt-BR" ? "BRL" : "USD"
  const money = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
  const compact = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  })
  const percent = new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: 0 })
  const month = new Intl.DateTimeFormat(intlLocale, { month: "short" })
  const longMonth = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" })
  const dateTime = new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  return {
    money: (value: number) => money.format(value),
    compact: (value: number) => compact.format(value),
    percent: (value: number) => percent.format(value),
    month: (index: number) => month.format(new Date(MONTHS_YEAR, MONTHS[index], 1)),
    longMonth: (index: number) => longMonth.format(new Date(MONTHS_YEAR, MONTHS[index], 1)),
    dateTime: (at: number) => dateTime.format(at),
  }
}

type Format = ReturnType<typeof formatters>

function StatusDot({ status }: { status: Status }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])} />
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-5">
      <h3 className="font-heading text-3xl tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </header>
  )
}

function ChartCard({
  title,
  hint,
  className,
  children,
}: {
  title: string
  hint: string
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className={cn("rounded-xl border p-4", className)}>
      <header className="mb-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </header>
      {children}
    </section>
  )
}

function Legend({ copy, fills }: { copy: Copy; fills: Record<InvoiceStatus, string> }) {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {INVOICE_STATUSES.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("h-3 w-5 rounded-sm", fills[status])} />
          {copy.invoice[status]}
        </li>
      ))}
    </ul>
  )
}

function Dashboard({
  copy,
  projects,
  format,
}: {
  copy: Copy
  projects: Project[]
  format: Format
}) {
  const data = metrics(projects)
  const tiles = [
    { label: copy.dashboard.billed, value: data.billed, tone: "" },
    { label: copy.dashboard.received, value: data.received, tone: "text-success" },
    { label: copy.dashboard.receivable, value: data.receivable, tone: "" },
    { label: copy.dashboard.overdue, value: data.overdue, tone: "text-destructive" },
    { label: copy.dashboard.toolCost, value: data.toolCost, tone: "" },
  ]
  const revenuePeak = Math.max(
    ...data.revenueByMonth.map((month) => month.paid + month.pending + month.overdue),
  )
  const clientPeak = Math.max(...data.clientGrowth)
  const points = data.clientGrowth.map((value, index) => [
    (index / (data.clientGrowth.length - 1)) * 100,
    100 - (value / clientPeak) * 85,
  ])
  const line = points.map(([x, y]) => `${x},${y}`).join(" ")
  const profitPeak = Math.max(...data.profits.map((item) => item.profit))

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={copy.dashboard.title} description={copy.dashboard.description} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border p-3">
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className={cn("mt-1 text-lg font-semibold tabular-nums", tile.tone)}>
              {format.money(tile.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard
          title={copy.dashboard.revenue}
          hint={fill(copy.dashboard.revenueHint, {
            projects: data.projects,
            clients: data.clients,
            margin: format.percent(data.margin),
          })}
          className="lg:col-span-2"
        >
          <ul className="flex h-44 items-end gap-3 border-b pb-0">
            {data.revenueByMonth.map((month, index) => {
              const label = INVOICE_STATUSES.map(
                (status) => `${copy.invoice[status]}: ${format.money(month[status])}`,
              ).join(" · ")
              const total = month.paid + month.pending + month.overdue
              return (
                <li
                  key={MONTHS[index]}
                  title={`${format.longMonth(index)} · ${label}`}
                  aria-label={`${format.longMonth(index)} · ${label}`}
                  className="flex h-full flex-1 items-end transition-opacity hover:opacity-80"
                >
                  <span
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-md"
                    style={{ height: `${(total / revenuePeak) * 100}%` }}
                  >
                    {INVOICE_STATUSES.map((status) => (
                      <span
                        key={status}
                        className={cn("w-full", SERIES_FILL[status])}
                        style={{ height: `${(month[status] / total) * 100}%` }}
                      />
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-2 flex gap-3">
            {MONTHS.map((month, index) => (
              <span
                key={month}
                className="flex-1 text-center text-xs text-muted-foreground capitalize"
              >
                {format.month(index)}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <Legend copy={copy} fills={SERIES_FILL} />
          </div>
        </ChartCard>

        <ChartCard title={copy.dashboard.clientGrowth} hint={copy.dashboard.clientGrowthHint}>
          <div className="relative h-44">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full" aria-hidden>
              <defs>
                <linearGradient id="mockup-client-growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${line} 100,100`} fill="url(#mockup-client-growth)" />
              <polyline
                points={line}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="absolute top-0 left-0 text-xs text-muted-foreground tabular-nums">
              {clientPeak}
            </span>
          </div>
          <ol className="mt-2 flex justify-between">
            {data.clientGrowth.map((value, index) => (
              <li
                key={MONTHS[index]}
                aria-label={`${format.longMonth(index)}: ${value}`}
                className="text-xs text-muted-foreground capitalize"
              >
                {format.month(index)}
              </li>
            ))}
          </ol>
        </ChartCard>
      </div>

      <ChartCard title={copy.dashboard.profit} hint={copy.dashboard.profitHint}>
        <ul className="flex flex-col gap-2">
          {data.profits.map((item) => (
            <li key={item.name} className="flex items-center gap-3 text-xs">
              <span className="w-32 shrink-0 truncate text-muted-foreground">{item.name}</span>
              <span className="flex flex-1 items-center gap-2">
                <span
                  className="h-5 rounded-r-md bg-chart-1"
                  style={{ width: `${(item.profit / profitPeak) * 85}%` }}
                />
                <span className="text-muted-foreground tabular-nums">
                  {format.compact(item.profit)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>

      <ChartCard title={copy.dashboard.ruler} hint={copy.dashboard.rulerHint}>
        <Legend copy={copy} fills={TICK_CLASS} />
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="flex items-end gap-3 pb-1">
              <span className="w-32 shrink-0" />
              <div className="grid flex-1 grid-cols-6 gap-1">
                {MONTHS.map((month, index) => (
                  <span key={month} className="text-[10px] text-muted-foreground capitalize">
                    {format.month(index)}
                  </span>
                ))}
              </div>
            </div>
            <ul className="flex flex-col divide-y">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center gap-3 py-2">
                  <span className="w-32 shrink-0 truncate text-sm">{project.name}</span>
                  <div className="grid flex-1 grid-cols-6 gap-1">
                    {project.invoices.map((invoice, index) => {
                      if (!invoice) return <span key={MONTHS[index]} className="h-6" />
                      const label = `${project.name} · ${format.longMonth(index)} · ${format.money(project.installment)} · ${copy.invoice[invoice]}`
                      return (
                        <span
                          key={MONTHS[index]}
                          title={label}
                          aria-label={label}
                          className={cn(
                            "h-6 rounded-sm transition-transform hover:scale-y-125",
                            TICK_CLASS[invoice],
                          )}
                        />
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ChartCard>
    </div>
  )
}

function Repo({ copy, repo }: { copy: Copy; repo: Project["repo"] }) {
  if (!repo) return <span className="text-muted-foreground">—</span>
  const { icon: Icon, className } = WORKFLOW_ICON[repo.workflow]
  return (
    <span className="flex items-center gap-2 text-muted-foreground">
      <span className="truncate">{repo.fullName}</span>
      <Icon
        role="img"
        aria-label={copy.workflow[repo.workflow]}
        className={cn("size-3.5 shrink-0", className)}
      />
    </span>
  )
}

function ProjectsTable({
  copy,
  projects,
  format,
}: {
  copy: Copy
  projects: Project[]
  format: Format
}) {
  return (
    <div>
      <PageHeader
        title={copy.projects.title}
        description={fill(copy.projects.count, { count: projects.length })}
      />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2.5 font-medium">{copy.projects.project}</th>
              <th className="px-3 py-2.5 font-medium">{copy.projects.status}</th>
              <th className="px-3 py-2.5 font-medium">{copy.projects.value}</th>
              <th className="px-3 py-2.5 font-medium">{copy.projects.tools}</th>
              <th className="px-3 py-2.5 font-medium">{copy.projects.github}</th>
            </tr>
          </thead>
          <tbody>
            {[...projects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((project) => {
                const count = project.invoices.filter(Boolean).length
                return (
                  <tr key={project.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-muted-foreground">{project.client}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_BADGE[project.status]}>
                        {copy.status[project.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {project.deal === "installment"
                        ? fill(copy.projects.installments, {
                            amount: format.money(project.installment * count),
                            count,
                          })
                        : fill(copy.projects.upfront, {
                            amount: format.money(project.installment),
                          })}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {project.tools.map((tool) => (
                          <Badge
                            key={tool.name}
                            variant={tool.monthlyCost > 0 ? "default" : "outline"}
                            title={
                              tool.monthlyCost > 0
                                ? fill(copy.projects.paidTool, {
                                    amount: format.money(tool.monthlyCost),
                                  })
                                : copy.projects.freeTool
                            }
                          >
                            {tool.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Repo copy={copy} repo={project.repo} />
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Kanban({
  copy,
  projects,
  onMove,
}: {
  copy: Copy
  projects: Project[]
  onMove: (id: string, status: Status) => void
}) {
  const dragged = useRef<string | null>(null)
  const [over, setOver] = useState<Status | null>(null)

  function handleDragStart(event: DragEvent, id: string) {
    dragged.current = id
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", id)
  }

  function handleDragOver(event: DragEvent, status: Status) {
    event.preventDefault()
    setOver(status)
  }

  function handleDrop(event: DragEvent, status: Status) {
    event.preventDefault()
    setOver(null)
    if (dragged.current) onMove(dragged.current, status)
    dragged.current = null
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-5 font-heading text-3xl tracking-tight">{copy.kanban.title}</h3>
      <div className="grid min-h-0 min-w-[640px] flex-1 grid-cols-4 gap-2">
        {STATUSES.map((status) => {
          const column = projects.filter((project) => project.status === status)
          return (
            <section
              key={status}
              aria-label={copy.status[status]}
              onDragOver={(event) => handleDragOver(event, status)}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => handleDrop(event, status)}
              className={cn(
                "flex min-h-0 flex-col rounded-2xl bg-muted/40 ring-1 ring-transparent transition-colors",
                over === status && "bg-muted ring-ring",
              )}
            >
              <header className="flex items-center gap-2 px-3 py-2.5">
                <StatusDot status={status} />
                <h4 className="min-w-0 flex-1 truncate text-xs font-medium">
                  {copy.status[status]}
                </h4>
                <span className="text-xs text-muted-foreground tabular-nums">{column.length}</span>
              </header>
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0">
                {column.length === 0 ? (
                  <li className="rounded-lg border border-dashed px-2 py-6 text-center text-xs text-muted-foreground">
                    {copy.kanban.empty}
                  </li>
                ) : (
                  column.map((project) => (
                    <li
                      key={project.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, project.id)}
                      onDragEnd={() => {
                        dragged.current = null
                        setOver(null)
                      }}
                      className="flex cursor-grab flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-border active:cursor-grabbing"
                    >
                      <span className="truncate font-heading text-base">{project.name}</span>
                      <Badge variant="muted">
                        <User />
                        {project.client}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Audit({ copy, audit, format }: { copy: Copy; audit: AuditEntry[]; format: Format }) {
  return (
    <div>
      <PageHeader title={copy.audit.title} description={copy.audit.description} />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2.5 font-medium">{copy.audit.date}</th>
              <th className="px-3 py-2.5 font-medium">{copy.audit.module}</th>
              <th className="px-3 py-2.5 font-medium">{copy.audit.action}</th>
              <th className="px-3 py-2.5 font-medium">{copy.audit.object}</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="px-3 py-2.5 whitespace-nowrap">{format.dateTime(entry.at)}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={MODULE_BADGE[entry.module]}>
                    {copy.audit.modules[entry.module]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div>{copy.audit.actions[entry.action]}</div>
                  {entry.change && (
                    <div className="text-xs text-muted-foreground">
                      {copy.status[entry.change.from]} → {copy.status[entry.change.to]}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-medium">{entry.object ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AppMockup({
  copy,
  locale,
  address,
}: {
  copy: Copy
  locale: Locale
  address: string
}) {
  const [state, dispatch] = useReducer(mockupReducer, undefined, initialState)
  const [view, setView] = useState<View>("dashboard")
  const format = formatters(locale)

  function renderView() {
    switch (view) {
      case "dashboard":
        return <Dashboard copy={copy} projects={state.projects} format={format} />
      case "projects":
        return <ProjectsTable copy={copy} projects={state.projects} format={format} />
      case "kanban":
        return (
          <Kanban
            copy={copy}
            projects={state.projects}
            onMove={(id, status) => dispatch({ type: "move", id, status, at: Date.now() })}
          />
        )
      case "audit":
        return <Audit copy={copy} audit={state.audit} format={format} />
    }
  }

  return (
    <figure aria-label={copy.label}>
      <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl shadow-black/70 ring-1 ring-white/5">
        <div className="flex h-10 items-center gap-3 border-b bg-sidebar px-4">
          <div aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <span className="mx-auto truncate rounded-md bg-muted/60 px-3 py-0.5 text-xs text-muted-foreground">
            {address}
          </span>
        </div>

        <div className="flex h-[600px] flex-col text-left md:flex-row">
          <aside className="shrink-0 border-b bg-sidebar md:w-52 md:border-r md:border-b-0">
            <div className="hidden h-14 items-center gap-2.5 px-4 md:flex">
              <div className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                O
              </div>
              <span className="text-sm font-semibold tracking-tight">{copy.brand}</span>
            </div>
            <nav aria-label={copy.views} className="flex gap-0.5 overflow-x-auto p-2 md:flex-col">
              {VIEWS.map((id) => {
                const Icon = VIEW_ICON[id]
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={view === id ? "page" : undefined}
                    onClick={() => setView(id)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/65 transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      view === id && "bg-sidebar-accent text-sidebar-foreground",
                    )}
                  >
                    <Icon aria-hidden className="size-4" />
                    {copy.nav[id]}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="min-h-0 flex-1 overflow-auto p-5">{renderView()}</div>
        </div>
      </div>
    </figure>
  )
}
