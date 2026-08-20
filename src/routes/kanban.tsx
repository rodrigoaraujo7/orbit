import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { CircleCheck, Code, FolderKanban, Percent, Plus, X } from "lucide-react"

import { StatTile } from "@/components/dashboard/cards"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ProjectIssueDialog } from "@/components/kanban/project-issue-dialog"
import { PageHeader } from "@/components/layout/page"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, type SelectOption } from "@/components/ui/select"
import { formatPercent } from "@/lib/format"
import { emptyKanbanFilters, matchesKanbanFilter, type KanbanFilters } from "@/lib/kanban-filter"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"

const count = (value: number) => Math.round(value).toLocaleString("pt-BR")

function KanbanPage() {
  const { projects, findProject } = useProjects()
  const { contacts, findContact } = useRegistry()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filters, setFilters] = useState<KanbanFilters>(emptyKanbanFilters)
  const project = selectedId ? findProject(selectedId) : undefined

  function clientNameOf(clientId: string) {
    return findContact(clientId)?.name ?? "—"
  }

  const filtered = useMemo(
    () =>
      projects.filter((item) =>
        matchesKanbanFilter(item, filters, findContact(item.clientId)?.name ?? "")
      ),
    [projects, filters, findContact]
  )

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

  const isFiltered =
    filters.search !== "" ||
    filters.clientId !== "" ||
    filters.monthFrom !== "" ||
    filters.monthTo !== ""

  function setFilter(patch: Partial<KanbanFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  return (
    <>
      <PageHeader
        title="Kanban"
        description="O que está em desenvolvimento e o que está na fila."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            <Plus />
            Novo projeto
          </Button>
        }
      />

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />

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

      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6 lg:px-8">
        <Input
          value={filters.search}
          onChange={(event) => setFilter({ search: event.target.value })}
          placeholder="Buscar por nome..."
          className="flex-1"
        />
        <div className="w-full sm:w-52">
          <Select
            value={filters.clientId}
            onValueChange={(clientId) => setFilter({ clientId })}
            options={clientOptions}
            placeholder="Todos os clientes"
          />
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker
            value={filters.monthFrom}
            onChange={(monthFrom) => setFilter({ monthFrom })}
            placeholder="Início"
            aria-label="Mês inicial"
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            até
          </span>
          <MonthPicker
            value={filters.monthTo}
            onChange={(monthTo) => setFilter({ monthTo })}
            placeholder="Fim"
            aria-label="Mês final"
          />
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(emptyKanbanFilters)}>
            <X />
            Limpar
          </Button>
        )}
      </div>

      <KanbanBoard
        clientName={clientNameOf}
        filter={(item) =>
          matchesKanbanFilter(item, filters, findContact(item.clientId)?.name ?? "")
        }
        onOpen={(id) => {
          setSelectedId(id)
          setOpen(true)
        }}
      />
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
  component: KanbanPage,
})
