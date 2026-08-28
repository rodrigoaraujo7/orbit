import { useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Info, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { AuditChange, AuditModule } from "shared"

import { PageHeader } from "@/components/layout/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FilterDrawer } from "@/components/ui/filter-drawer"
import { Input } from "@/components/ui/input"
import { Select, type SelectOption } from "@/components/ui/select"
import { DataTable, type Column, type SortState } from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { auditActionLabel, auditModuleLabel, auditModuleOptions } from "@/i18n/labels"
import { formatAuditAt, formatAuditChange } from "@/lib/audit-labels"
import { periodBounds, type PeriodPreset } from "@/lib/audit-period"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { trpc } from "@/lib/trpc"
import { useDebouncedValue } from "@/lib/use-debounced-value"

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
  const { t } = useTranslation()
  const PERIOD_OPTIONS: SelectOption[] = [
    { value: "today", label: t("audit.today") },
    { value: "7d", label: t("audit.days7") },
    { value: "30d", label: t("audit.days30") },
    { value: "90d", label: t("audit.days90") },
    { value: "all", label: t("audit.allTime") },
    { value: "custom", label: t("audit.custom") },
  ]
  return (
    <>
      <Input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={t("audit.search")}
        className={stacked ? "w-full" : "flex-1"}
      />
      <div className={stacked ? "w-full" : "w-48"}>
        <Select
          value={module}
          onValueChange={onModule}
          options={auditModuleOptions()}
          placeholder={t("common.module")}
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
            aria-label={t("common.from")}
            className={stacked ? "w-full" : "w-40"}
          />
          <Input
            type="date"
            value={customTo}
            onChange={(event) => onTo(event.target.value)}
            aria-label={t("common.to")}
            className={stacked ? "w-full" : "w-40"}
          />
        </>
      )}
    </>
  )
}

function AuditPage() {
  const { t } = useTranslation()
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
  const [sort, setSort] = useState<SortState>(null)
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const debouncedSearch = useDebouncedValue(search)
  const range = periodBounds(period, customFrom, customTo)
  const filterKey = JSON.stringify({
    search: debouncedSearch,
    module,
    period,
    customFrom,
    customTo,
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
        search: debouncedSearch,
        module,
        from: range.from,
        to: range.to,
        cursor: cursorStack[pageIndex],
        limit: Number(pageSize),
        ...sortParams,
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
        ...sortParams,
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

  function objectCell(row: AuditEntry) {
    const label = row.subjectLabel || t("common.emDash")
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
      header: t("common.date"),
      className: "whitespace-nowrap",
      sortValue: (row) => row.createdAt,
      cell: (row) => formatAuditAt(row.createdAt),
    },
    {
      key: "module",
      header: t("common.module"),
      sortValue: (row) => row.module,
      cell: (row) => (
        <Badge variant={MODULE_BADGE[row.module]}>{auditModuleLabel(row.module)}</Badge>
      ),
    },
    {
      key: "action",
      header: t("common.action"),
      cell: (row) => auditActionLabel(row.action),
    },
    {
      key: "subject",
      header: t("common.object"),
      cell: objectCell,
    },
    {
      key: "details",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Tooltip label={t("audit.viewDetails")} side="top">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("audit.viewDetails")}
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
        title={t("audit.title")}
        description={t("audit.description")}
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
            {t("audit.loadError")}
          </p>
        ) : (
          <DataTable
            data={items}
            columns={columns}
            rowKey={(row) => row.id}
            emptyMessage={
              query.isPending ? t("common.loading") : t("audit.empty")
            }
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

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div>
                  <DialogTitle>
                    {auditActionLabel(selected.action)}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {t("audit.eventDetails")}
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelected(null)}
                  aria-label={t("common.close")}
                >
                  <X />
                </Button>
              </DialogHeader>
              <div className="flex flex-col gap-4 px-5 py-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("common.date")}
                  </span>
                  {formatAuditAt(selected.createdAt)}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("common.module")}
                  </span>
                  <span>
                    <Badge variant={MODULE_BADGE[selected.module]}>
                      {auditModuleLabel(selected.module)}
                    </Badge>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("common.object")}
                  </span>
                  {objectCell(selected)}
                </div>
                {selected.changes.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t("audit.changes")}
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
                      {t("audit.ip")}
                    </span>
                    {selected.ip}
                  </div>
                ) : null}
                {selected.userAgent ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t("audit.userAgent")}
                    </span>
                    <span className="break-all">{selected.userAgent}</span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const Route = createFileRoute("/audit")({
  component: AuditPage,
})
