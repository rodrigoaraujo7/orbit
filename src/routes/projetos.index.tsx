import { useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page"
import { CreateProjectDialog } from "@/components/projetos/create-project-dialog"
import {
  StatusBadge,
  StatusFilterSelect,
  WorkflowBadge,
  WorkflowFilterSelect,
} from "@/components/projetos/status-badges"
import { ToolIcon } from "@/components/projetos/tool-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import {
  BILLING_CYCLE_LABEL,
  type Project,
  type ProjectStatus,
  type WorkflowStatus,
} from "@/data/projects"
import { formatCurrency, formatDeal } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 por página" },
  { value: "25", label: "25 por página" },
  { value: "50", label: "50 por página" },
]

type SortColumn = "name" | "status" | "valor"

/**
 * Cabeçalho clicável de coluna ordenável. Só troca `sortBy`/`sortDir` — quem
 * de fato ordena a lista é o backend, aqui é só o controle visual.
 */
function SortableHeader({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  column: SortColumn
  label: string
  sortBy: SortColumn
  sortDir: "asc" | "desc"
  onSort: (column: SortColumn) => void
  className?: string
}) {
  const active = sortBy === column
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <th className={cn("font-medium text-muted-foreground", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <Icon className={cn("size-3.5", !active && "text-muted-foreground/50")} />
      </button>
    </th>
  )
}

function ProjetosPage() {
  const { projects, deleteProject } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const navigate = useNavigate()

  // Filtro, ordenação e paginação: estado de UI só. Quem aplica de fato é o
  // backend (a lista renderizada aqui continua sendo `projects` inteiro).
  const [nameFilter, setNameFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("")
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | "">("")
  const [sortBy, setSortBy] = useState<SortColumn>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState("10")

  function toggleSort(column: SortColumn) {
    if (sortBy === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortDir("asc")
    }
  }

  function editProject(project: Project) {
    setEditingProject(project)
    setDialogOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Projetos"
        description={`${projects.length} projetos cadastrados.`}
        actions={
          <Button
            onClick={() => {
              setEditingProject(null)
              setDialogOpen(true)
            }}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            <Plus />
            Novo projeto
          </Button>
        }
      />

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject ?? undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir projeto"
        description={
          <>
            Excluir{" "}
            <span className="font-medium text-primary">
              {deletingProject?.name}
            </span>
            ? Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        confirmWord="excluir"
        onConfirm={() => {
          if (!deletingProject) return
          try {
            deleteProject(deletingProject.id)
            toast.add({ title: "Projeto excluído", type: "success" })
          } catch {
            toast.add({ title: "Erro ao excluir projeto", type: "error" })
          }
        }}
      />

      <div className="flex flex-col gap-3 px-4 pt-6 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <Input
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1"
        />
        <div className="w-full sm:w-44">
          <StatusFilterSelect value={statusFilter} onValueChange={setStatusFilter} />
        </div>
        <div className="w-full sm:w-48">
          <WorkflowFilterSelect
            value={workflowFilter}
            onValueChange={setWorkflowFilter}
          />
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <SortableHeader
                  column="name"
                  label="Projeto"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="px-4 py-2.5"
                />
                <SortableHeader
                  column="status"
                  label="Status"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="px-4 py-2.5"
                />
                <SortableHeader
                  column="valor"
                  label="Valor"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="hidden px-4 py-2.5 sm:table-cell"
                />
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground md:table-cell">
                  Ferramentas
                </th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground lg:table-cell">
                  GitHub
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project, i) => (
                <tr
                  key={project.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  // conveniência pro mouse; o teclado navega pelo link do nome
                  onClick={() =>
                    navigate({
                      to: "/projetos/$projectId",
                      params: { projectId: project.id },
                    })
                  }
                  className="animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards cursor-pointer border-b transition-colors duration-500 last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/projetos/$projectId"
                      params={{ projectId: project.id }}
                      className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {project.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {project.client}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={project.status} />
                  </td>

                  <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground sm:table-cell">
                    {formatDeal(project.deal)}
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {project.tools.map((tool) => {
                        return (
                          <Badge
                            key={`${tool.id}-${tool.name}`}
                            variant={tool.billing ? "default" : "outline"}
                            title={
                              tool.billing
                                ? `Paga · ${formatCurrency(tool.billing.amount, tool.billing.currency)} ${BILLING_CYCLE_LABEL[tool.billing.cycle].toLowerCase()}`
                                : "Plano free"
                            }
                          >
                            <ToolIcon id={tool.id} className="size-3" />
                            {tool.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 lg:table-cell">
                    {project.repo ? (
                      <div className="group flex items-center gap-2">
                        <a
                          href={project.repo.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="truncate">
                            {project.repo.fullName}
                          </span>
                        </a>
                        <WorkflowBadge status={project.repo.workflow} iconOnly />
                        <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td
                    className="px-4 py-3 text-right whitespace-nowrap"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <RowActionsMenu
                      onEdit={() => editProject(project)}
                      onDelete={() => {
                        setDeletingProject(project)
                        setDeleteDialogOpen(true)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
          <div className="w-full sm:w-44">
            <Select
              value={pageSize}
              onValueChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
              options={PAGE_SIZE_OPTIONS}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {page}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => p + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/projetos/")({
  component: ProjetosPage,
})
