import { useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { AuditChange, AuditModule } from "shared"

import { PageHeader } from "@/components/layout/page"
import { Badge } from "@/components/ui/badge"
import { FilterDrawer } from "@/components/ui/filter-drawer"
import { Input } from "@/components/ui/input"
import { Select, type SelectOption } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/table"
import {
  AUDIT_ACTION_LABEL,
  AUDIT_MODULE_LABEL,
  formatAuditAt,
  formatAuditDetails,
} from "@/lib/audit-labels"
import { periodBounds, type PeriodPreset } from "@/lib/audit-period"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { trpc } from "@/lib/trpc"
import { useDebouncedValue } from "@/lib/use-debounced-value"

type AuditCursor = { createdAt: string; id: string }

type AuditEntry = {
  id: string
  module: AuditModule
  action: string
  subjectId: string | null
  subjectLabel: string | null
  projectId: string | null
  changes: AuditChange[]
  createdAt: string
}

const MODULE_OPTIONS: SelectOption[] = [
  { value: "", label: "Todos os módulos" },
  ...Object.entries(AUDIT_MODULE_LABEL).map(([value, label]) => ({ value, label })),
]

const PERIOD_OPTIONS: SelectOption[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Tudo" },
  { value: "custom", label: "Personalizado" },
]

const MODULE_BADGE: Record<AuditModule, "default" | "muted" | "outline" | "success" | "warning" | "destructive"> = {
  project: "default",
  kanban: "outline",
  settings: "muted",
  security: "destructive",
}

function AuditFilterFields({
  stacked = false,
  search,
  onSearch,
  module,
  onModule,
  period,
  onPeriod,
  customFrom,
  onFrom,
  customTo,
  onTo,
}: {
  stacked?: boolean
  search: string
  onSearch: (value: string) => void
  module: string
  onModule: (value: string) => void
  period: PeriodPreset
  onPeriod: (value: PeriodPreset) => void
  customFrom: string
  onFrom: (value: string) => void
  customTo: string
  onTo: (value: string) => void
}) {
  return (
    <>
      <Input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Buscar por ação ou objeto..."
        className={stacked ? "w-full" : "flex-1"}
      />
      <div className={stacked ? "w-full" : "w-48"}>
        <Select value={module} onValueChange={onModule} options={MODULE_OPTIONS} />
      </div>
      <div className={stacked ? "w-full" : "w-44"}>
        <Select
          value={period}
          onValueChange={(value) => onPeriod(value as PeriodPreset)}
          options={PERIOD_OPTIONS}
        />
      </div>
      {period === "custom" && (
        <>
          <Input
            type="date"
            value={customFrom}
            onChange={(event) => onFrom(event.target.value)}
            aria-label="De"
            className={stacked ? "w-full" : "w-40"}
          />
          <Input
            type="date"
            value={customTo}
            onChange={(event) => onTo(event.target.value)}
            aria-label="Até"
            className={stacked ? "w-full" : "w-40"}
          />
        </>
      )}
    </>
  )
}

function AuditPage() {
  const { findProject } = useProjects()
  const { findContact } = useRegistry()
  const [search, setSearch] = useState("")
  const [module, setModule] = useState("")
  const [period, setPeriod] = useState<PeriodPreset>("30d")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [pageSize, setPageSize] = useState("25")
  const [cursors, setCursors] = useState<(AuditCursor | null)[]>([null])
  const [page, setPage] = useState(0)

  const debouncedSearch = useDebouncedValue(search)
  const range = periodBounds(period, customFrom, customTo)
  const filterKey = JSON.stringify({
    search: debouncedSearch,
    module,
    period,
    customFrom,
    customTo,
    pageSize,
  })
  const [appliedKey, setAppliedKey] = useState(filterKey)
  let pageIndex = page
  let cursorStack = cursors
  if (appliedKey !== filterKey) {
    setAppliedKey(filterKey)
    setCursors([null])
    setPage(0)
    pageIndex = 0
    cursorStack = [null]
  }

  const query = useQuery({
    queryKey: [
      "audit",
      {
        search: debouncedSearch,
        module,
        from: range.from,
        to: range.to,
        cursor: cursorStack[pageIndex],
        limit: Number(pageSize),
      },
    ],
    queryFn: () =>
      trpc.audit.list.query({
        search: debouncedSearch || undefined,
        modules: module ? [module as AuditModule] : undefined,
        from: range.from,
        to: range.to,
        cursor: cursorStack[pageIndex],
        limit: Number(pageSize),
      }),
    placeholderData: keepPreviousData,
  })

  const items = (query.data?.items ?? []) as AuditEntry[]
  const nextCursor = query.data?.nextCursor ?? null

  const hasActive =
    search.trim() !== "" || module !== "" || period !== "all"

  function clearFilters() {
    setSearch("")
    setModule("")
    setPeriod("all")
    setCustomFrom("")
    setCustomTo("")
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: "createdAt",
      header: "Data",
      className: "whitespace-nowrap",
      cell: (row) => formatAuditAt(row.createdAt),
    },
    {
      key: "module",
      header: "Módulo",
      cell: (row) => (
        <Badge variant={MODULE_BADGE[row.module]}>{AUDIT_MODULE_LABEL[row.module]}</Badge>
      ),
    },
    {
      key: "action",
      header: "Ação",
      cell: (row) => AUDIT_ACTION_LABEL[row.action] ?? row.action,
    },
    {
      key: "subject",
      header: "Objeto",
      cell: (row) => {
        const label = row.subjectLabel || "—"
        if (row.projectId && findProject(row.projectId)) {
          return (
            <Link
              to="/projects/$projectId"
              params={{ projectId: row.projectId }}
              className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </Link>
          )
        }
        return label
      },
    },
    {
      key: "details",
      header: "Detalhes",
      className: "hidden md:table-cell",
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatAuditDetails(row.changes, row.action, (id) => findContact(id)?.name ?? id)}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Histórico das ações feitas na sua conta."
        actions={
          <FilterDrawer hasActive={hasActive} onClear={clearFilters}>
            <AuditFilterFields
              stacked
              search={search}
              onSearch={setSearch}
              module={module}
              onModule={setModule}
              period={period}
              onPeriod={setPeriod}
              customFrom={customFrom}
              onFrom={setCustomFrom}
              customTo={customTo}
              onTo={setCustomTo}
            />
          </FilterDrawer>
        }
      />

      <div className="hidden gap-3 px-4 pt-6 md:flex md:flex-row md:items-center sm:px-6 lg:px-8">
        <AuditFilterFields
          search={search}
          onSearch={setSearch}
          module={module}
          onModule={setModule}
          period={period}
          onPeriod={setPeriod}
          customFrom={customFrom}
          onFrom={setCustomFrom}
          customTo={customTo}
          onTo={setCustomTo}
        />
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {query.isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar o log de auditoria.
          </p>
        ) : (
          <DataTable
            data={items}
            columns={columns}
            rowKey={(row) => row.id}
            emptyMessage={
              query.isPending ? "Carregando…" : "Nenhum evento encontrado com esses filtros."
            }
            serverPagination={{
              hasPrev: pageIndex > 0,
              hasNext: Boolean(nextCursor),
              pageSize,
              onPrev: () => setPage((current) => Math.max(0, current - 1)),
              onNext: () => {
                if (!nextCursor) return
                setCursors((current) => {
                  const next = current.slice(0, pageIndex + 1)
                  next.push(nextCursor)
                  return next
                })
                setPage((current) => current + 1)
              },
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>
    </>
  )
}

export const Route = createFileRoute("/audit")({
  component: AuditPage,
})
