import { useCallback, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CircleCheck, Code, FolderKanban, Percent, Plus, X } from "lucide-react"
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
import { formatPercent } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { trpc } from "@/lib/trpc"
import { useDraftSearch } from "@/lib/use-draft-search"

const count = (value: number) => Math.round(value).toLocaleString("pt-BR")

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
  return (
    <>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar por nome..."
        className={stacked ? "w-full" : "flex-1"}
      />
      <div className={stacked ? "w-full" : "w-52"}>
        <Select
          value={clientId}
          onValueChange={onClientChange}
          options={clientOptions}
          placeholder="Todos os clientes"
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
          placeholder="Início"
          aria-label="Mês inicial"
        />
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          até
        </span>
        <MonthPicker
          value={monthTo}
          onChange={onMonthToChange}
          placeholder="Fim"
          aria-label="Mês final"
        />
      </div>
    </>
  )
}

function KanbanPage() {
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
    return findContact(clientId)?.name ?? "—"
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
    { value: "", label: "Todos os clientes" },
    ...contacts
      .filter((contact) => projects.some((item) => item.clientId === contact.id))
      .map((contact) => ({ value: contact.id, label: contact.name })),
  ]

  const isFiltered = Boolean(search.q || search.client || search.from || search.to)

  return (
    <>
      <PageHeader
        title="Kanban"
        description="O que está em desenvolvimento e o que está na fila."
        actions={
          <div className="mt-3 flex w-full gap-2 sm:mt-0 sm:w-auto">
            <Button onClick={() => setDialogOpen(true)} className="flex-1 md:flex-none">
              <Plus />
              Novo projeto
            </Button>
            <FilterDrawer
              hasActive={isFiltered}
              onClear={() =>
                patchSearch({ q: undefined, client: undefined, from: undefined, to: undefined })
              }
            >
              <KanbanFilterFields
                stacked
                search={nameDraft}
                clientId={search.client ?? ""}
                monthFrom={search.from ?? ""}
                monthTo={search.to ?? ""}
                clientOptions={clientOptions}
                onSearchChange={setNameDraft}
                onClientChange={(client) => patchSearch({ client: client || undefined })}
                onMonthFromChange={(from) => patchSearch({ from: from || undefined })}
                onMonthToChange={(to) => patchSearch({ to: to || undefined })}
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
          onClientChange={(client) => patchSearch({ client: client || undefined })}
          onMonthFromChange={(from) => patchSearch({ from: from || undefined })}
          onMonthToChange={(to) => patchSearch({ to: to || undefined })}
        />
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              patchSearch({ q: undefined, client: undefined, from: undefined, to: undefined })
            }
          >
            <X />
            Limpar
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
            label="Projetos concluídos"
            value={completed}
            format={count}
            tone="success"
            icon={<CircleCheck />}
            iconClassName="bg-success/10 text-success"
            delay={0}
          />
          <StatTile
            label="Em desenvolvimento"
            value={inDevelopment}
            format={count}
            tone="warning"
            icon={<Code />}
            iconClassName="bg-warning/10 text-warning"
            delay={40}
          />
          <StatTile
            label="Total de projetos"
            value={total}
            format={count}
            icon={<FolderKanban />}
            delay={80}
          />
          <StatTile
            label="Taxa de conclusão"
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
