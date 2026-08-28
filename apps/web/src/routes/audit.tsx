import { useCallback, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Info } from "lucide-react"
import {
  auditSearchSchema,
  compactSearch,
  parseSearch,
  type AuditChange,
  type AuditModule,
} from "shared"

import { PageHeader } from "@/components/layout/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilterDrawer } from "@/components/ui/filter-drawer"
import { FilterPending, TableFilterSkeleton } from "@/components/ui/filter-pending"
import { Input } from "@/components/ui/input"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Select, type SelectOption } from "@/components/ui/select"
import { DataTable, type Column, type SortState } from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import {
  AUDIT_ACTION_LABEL,
  AUDIT_MODULE_LABEL,
  formatAuditAt,
  formatAuditChange,
} from "@/lib/audit-labels"
import { periodBounds, type PeriodPreset } from "@/lib/audit-period"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { trpc } from "@/lib/trpc"
import { useDraftSearch } from "@/lib/use-draft-search"

type AuditCursor = { createdAt: string; id: string; module?: string }

type AuditEntry = {
  id: string
  module: AuditModule
  action: string
  subjectId: string | null
  subjectLabel: string | null
  projectId: string | null
  changes: AuditChange[]
  createdAt: string
  ip: string | null
  userAgent: string | null
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
        <Select
          value={module}
          onValueChange={onModule}
          options={MODULE_OPTIONS}
          placeholder="Módulo"
        />
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
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [pageSize, setPageSize] = useState("25")
  const [cursors, setCursors] = useState<(AuditCursor | null)[]>([null])
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState>(null)
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const patchSearch = useCallback(
    (patch: Partial<typeof search>) => {
      void navigate({
        search: (prev) => {
          const next = { ...prev, ...patch }
          return compactSearch({
            ...next,
            period: next.period === "30d" ? undefined : next.period,
            from: next.period === "custom" ? next.from : undefined,
            to: next.period === "custom" ? next.to : undefined,
          })
        },
        replace: true,
      })
    },
    [navigate],
  )

  const [searchDraft, setSearchDraft] = useDraftSearch(search.q, (q) => patchSearch({ q }))
  const period = search.period ?? "30d"
  const range = periodBounds(period, search.from ?? "", search.to ?? "")
  const filterKey = JSON.stringify({
    search: search.q,
    module: search.module,
    period,
    from: search.from,
    to: search.to,
    pageSize,
    sort,
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

  const sortParams =
    sort?.key === "createdAt"
      ? { sortBy: "createdAt" as const, sortDir: sort.direction }
      : sort?.key === "module"
        ? { sortBy: "module" as const, sortDir: sort.direction }
        : {}

  const query = useQuery({
    queryKey: [
      "audit",
      {
        search: search.q,
        module: search.module,
        from: range.from,
        to: range.to,
        cursor: cursorStack[pageIndex],
        limit: Number(pageSize),
        ...sortParams,
      },
    ],
    queryFn: () =>
      trpc.audit.list.query({
        search: search.q || undefined,
        modules: search.module ? [search.module] : undefined,
        from: range.from,
        to: range.to,
        cursor: cursorStack[pageIndex],
        limit: Number(pageSize),
        ...sortParams,
      }),
    placeholderData: keepPreviousData,
  })

  const items = (query.data?.items ?? []) as AuditEntry[]
  const nextCursor = query.data?.nextCursor ?? null

  const hasActive = Boolean(search.q?.trim()) || Boolean(search.module) || period !== "all"

  function clearFilters() {
    patchSearch({
      q: undefined,
      module: undefined,
      period: "all",
      from: undefined,
      to: undefined,
    })
  }

  function objectCell(row: AuditEntry) {
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
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: "createdAt",
      header: "Data",
      className: "whitespace-nowrap",
      sortValue: (row) => row.createdAt,
      cell: (row) => formatAuditAt(row.createdAt),
    },
    {
      key: "module",
      header: "Módulo",
      sortValue: (row) => row.module,
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
      cell: objectCell,
    },
    {
      key: "details",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Tooltip label="Ver detalhes" side="top">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ver detalhes"
            onClick={() => setSelected(row)}
          >
            <Info />
          </Button>
        </Tooltip>
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
              search={searchDraft}
              onSearch={setSearchDraft}
              module={search.module ?? ""}
              onModule={(module) => patchSearch({ module: (module || undefined) as AuditModule | undefined })}
              period={period}
              onPeriod={(nextPeriod) =>
                patchSearch({
                  period: nextPeriod,
                  from: nextPeriod === "custom" ? search.from : undefined,
                  to: nextPeriod === "custom" ? search.to : undefined,
                })
              }
              customFrom={search.from ?? ""}
              onFrom={(from) => patchSearch({ from: from || undefined, period: "custom" })}
              customTo={search.to ?? ""}
              onTo={(to) => patchSearch({ to: to || undefined, period: "custom" })}
            />
          </FilterDrawer>
        }
      />

      <div className="hidden gap-3 px-4 pt-6 md:flex md:flex-row md:items-center sm:px-6 lg:px-8">
        <AuditFilterFields
          search={searchDraft}
          onSearch={setSearchDraft}
          module={search.module ?? ""}
          onModule={(module) => patchSearch({ module: (module || undefined) as AuditModule | undefined })}
          period={period}
          onPeriod={(nextPeriod) =>
            patchSearch({
              period: nextPeriod,
              from: nextPeriod === "custom" ? search.from : undefined,
              to: nextPeriod === "custom" ? search.to : undefined,
            })
          }
          customFrom={search.from ?? ""}
          onFrom={(from) => patchSearch({ from: from || undefined, period: "custom" })}
          customTo={search.to ?? ""}
          onTo={(to) => patchSearch({ to: to || undefined, period: "custom" })}
        />
      </div>

      <FilterPending
        isPending={query.isPending}
        isFetching={query.isFetching}
        skeleton={
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <TableFilterSkeleton />
          </div>
        }
      >
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
              emptyMessage="Nenhum evento encontrado com esses filtros."
              serverSort={{ sort, onSortChange: setSort }}
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
      </FilterPending>

      <ResponsiveDialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <ResponsiveDialogContent>
          {selected && (
            <>
              <ResponsiveDialogHeader>
                <div>
                  <ResponsiveDialogTitle>
                    {AUDIT_ACTION_LABEL[selected.action] ?? selected.action}
                  </ResponsiveDialogTitle>
                  <ResponsiveDialogDescription className="sr-only">
                    Detalhes do evento
                  </ResponsiveDialogDescription>
                </div>
                <ResponsiveDialogClose />
              </ResponsiveDialogHeader>
              <ResponsiveDialogBody className="flex flex-col gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Data
                  </span>
                  {formatAuditAt(selected.createdAt)}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Módulo
                  </span>
                  <span>
                    <Badge variant={MODULE_BADGE[selected.module]}>
                      {AUDIT_MODULE_LABEL[selected.module]}
                    </Badge>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Objeto
                  </span>
                  {objectCell(selected)}
                </div>
                {selected.changes.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Mudanças
                    </span>
                    <ul className="list-disc space-y-1 pl-4">
                      {selected.changes.map((change, index) => (
                        <li key={index}>
                          {formatAuditChange(change, (id) => findContact(id)?.name ?? id)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.ip ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      IP
                    </span>
                    {selected.ip}
                  </div>
                ) : null}
                {selected.userAgent ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      User-Agent
                    </span>
                    <span className="break-all">{selected.userAgent}</span>
                  </div>
                ) : null}
              </ResponsiveDialogBody>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}

export const Route = createFileRoute("/audit")({
  validateSearch: (search) => parseSearch(auditSearchSchema, search),
  component: AuditPage,
})
