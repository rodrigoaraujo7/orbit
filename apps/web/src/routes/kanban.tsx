import { useCallback, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CircleCheck, Code, FolderKanban, Percent, Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { compactSearch, kanbanSearchSchema, parseSearch } from "shared"

import { StatTile } from "@/components/dashboard/cards"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ProjectIssueDialog } from "@/components/kanban/project-issue-dialog"
import { PageHeader } from "@/components/layout/page"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { Button } from "@/components/ui/button"
import { FilterDrawer } from "@/components/ui/filter-drawer"
import { FilterPending, KanbanFilterSkeleton } from "@/components/ui/filter-pending"
import { Input } from "@/components/ui/input"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, type SelectOption } from "@/components/ui/select"
import type { Project } from "@/data/projects"
import { getLocale } from "@/i18n"
import { formatPercent } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { trpc } from "@/lib/trpc"
import { useDraftSearch } from "@/lib/use-draft-search"

const count = (value: number) => Math.round(value).toLocaleString(getLocale())

function KanbanFilterFields({
  stacked = false,
  search,
  clientId,
  monthFrom,
  monthTo,
  clientOptions,
  onSearchChange,
  onClientChange,
  onMonthFromChange,
  onMonthToChange,
}: {
  stacked?: boolean
  search: string
  clientId: string
  monthFrom: string
  monthTo: string
  clientOptions: SelectOption[]
  onSearchChange: (value: string) => void
  onClientChange: (value: string) => void
  onMonthFromChange: (value: string) => void
  onMonthToChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t("common.searchByName")}
        className={stacked ? "w-full" : "flex-1"}
      />
      <div className={stacked ? "w-full" : "w-52"}>
        <Select
          value={clientId}
          onValueChange={onClientChange}
          options={clientOptions}
          placeholder={t("common.allClients")}
        />
      </div>
      <div
        className={
          stacked
            ? "flex w-full items-center gap-2 [&>button]:min-w-0 [&>button]:flex-1"
            : "flex items-center gap-2"
        }
      >
        <MonthPicker
          value={monthFrom}
          onChange={onMonthFromChange}
          placeholder={t("common.start")}
          aria-label={t("common.startMonth")}
        />
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          {t("common.until")}
        </span>
        <MonthPicker
          value={monthTo}
          onChange={onMonthToChange}
          placeholder={t("common.end")}
          aria-label={t("common.endMonth")}
        />
      </div>
    </>
  )
}

function KanbanPage() {
  const { t } = useTranslation()
  const { projects, findProject } = useProjects()
  const { contacts, findContact } = useRegistry()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const project = selectedId ? findProject(selectedId) : undefined

  const patchSearch = useCallback(
    (patch: Partial<typeof search>) => {
      void navigate({
        search: (prev) => compactSearch({ ...prev, ...patch }),
        replace: true,
      })
    },
    [navigate],
  )

  const [nameDraft, setNameDraft] = useDraftSearch(search.q, (q) => patchSearch({ q }))

  function clientNameOf(clientId: string) {
    return findContact(clientId)?.name ?? t("common.emDash")
  }

  function onClientChange(client: string) {
    patchSearch({ client: client || undefined })
  }

  function onMonthFromChange(from: string) {
    patchSearch({ from: from || undefined })
  }

  function onMonthToChange(to: string) {
    patchSearch({ to: to || undefined })
  }

  function clearKanbanFilters() {
    patchSearch({ q: undefined, client: undefined, from: undefined, to: undefined })
  }

  const filters = {
    q: search.q,
    clientId: search.client,
    monthFrom: search.from,
    monthTo: search.to,
  }
  const query = useQuery({
    queryKey: ["projects", filters],
    queryFn: () => trpc.projects.list.query(filters),
    placeholderData: keepPreviousData,
  })
  const filtered = (query.data ?? []) as Project[]

  const completed = filtered.filter((item) => item.status === "completed").length
  const inDevelopment = filtered.filter((item) => item.status === "in-development").length
  const total = filtered.length
  const completionRate = total === 0 ? 0 : completed / total

  const clientOptions: SelectOption[] = [
    { value: "", label: t("common.allClients") },
    ...contacts
      .filter((contact) => projects.some((item) => item.clientId === contact.id))
      .map((contact) => ({ value: contact.id, label: contact.name })),
  ]

  const isFiltered = Boolean(search.q || search.client || search.from || search.to)

  return (
    <>
      <PageHeader
        title={t("kanban.title")}
        description={t("kanban.subtitle")}
        actions={
          <div className="mt-3 flex w-full gap-2 sm:mt-0 sm:w-auto">
            <Button onClick={() => setDialogOpen(true)} className="flex-1 md:flex-none">
              <Plus />
              {t("common.newProject")}
            </Button>
            <FilterDrawer hasActive={isFiltered} onClear={clearKanbanFilters}>
              <KanbanFilterFields
                stacked
                search={nameDraft}
                clientId={search.client ?? ""}
                monthFrom={search.from ?? ""}
                monthTo={search.to ?? ""}
                clientOptions={clientOptions}
                onSearchChange={setNameDraft}
                onClientChange={onClientChange}
                onMonthFromChange={onMonthFromChange}
                onMonthToChange={onMonthToChange}
              />
            </FilterDrawer>
          </div>
        }
      />

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="hidden gap-3 px-4 pt-4 md:flex md:flex-row md:flex-wrap md:items-center sm:px-6 lg:px-8">
        <KanbanFilterFields
          search={nameDraft}
          clientId={search.client ?? ""}
          monthFrom={search.from ?? ""}
          monthTo={search.to ?? ""}
          clientOptions={clientOptions}
          onSearchChange={setNameDraft}
          onClientChange={onClientChange}
          onMonthFromChange={onMonthFromChange}
          onMonthToChange={onMonthToChange}
        />
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearKanbanFilters}>
            <X />
            {t("common.clear")}
          </Button>
        )}
      </div>

      <FilterPending
        isPending={query.isPending}
        isFetching={query.isFetching}
        skeleton={<KanbanFilterSkeleton />}
      >
        <div className="grid grid-cols-2 gap-3 px-4 pt-6 xl:grid-cols-4 sm:px-6 lg:px-8">
          <StatTile
            label={t("kanban.completed")}
            value={completed}
            format={count}
            tone="success"
            icon={<CircleCheck />}
            iconClassName="bg-success/10 text-success"
            delay={0}
          />
          <StatTile
            label={t("kanban.inDevelopment")}
            value={inDevelopment}
            format={count}
            tone="warning"
            icon={<Code />}
            iconClassName="bg-warning/10 text-warning"
            delay={40}
          />
          <StatTile
            label={t("kanban.total")}
            value={total}
            format={count}
            icon={<FolderKanban />}
            delay={80}
          />
          <StatTile
            label={t("kanban.completionRate")}
            value={completionRate}
            format={formatPercent}
            icon={<Percent />}
            iconClassName="bg-primary/10 text-primary"
            delay={120}
          />
        </div>

        <KanbanBoard
          projects={filtered}
          clientName={clientNameOf}
          onOpen={(id) => {
            setSelectedId(id)
            setOpen(true)
          }}
        />
      </FilterPending>
      <ProjectIssueDialog
        project={project}
        contact={project ? findContact(project.clientId) : undefined}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

export const Route = createFileRoute("/kanban")({
  validateSearch: (search) => parseSearch(kanbanSearchSchema, search),
  component: KanbanPage,
})
