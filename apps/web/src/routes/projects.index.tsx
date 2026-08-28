import { useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ExternalLink, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/layout/page"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import {
  StatusBadge,
  StatusFilterSelect,
  WorkflowBadge,
  WorkflowFilterSelect,
} from "@/components/projects/status-badges"
import { ToolIcon } from "@/components/projects/tool-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Emphasis } from "@/components/ui/emphasis"
import { FilterDrawer } from "@/components/ui/filter-drawer"
import { Input } from "@/components/ui/input"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { type Project, type ProjectStatus, type WorkflowStatus } from "@/data/projects"
import { billingCycleLabel } from "@/i18n/labels"
import { formatCurrency, formatDeal } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"

function ProjectFilterFields({
  stacked = false,
  nameFilter,
  onNameChange,
  statusFilter,
  onStatusChange,
  workflowFilter,
  onWorkflowChange,
}: {
  stacked?: boolean
  nameFilter: string
  onNameChange: (value: string) => void
  statusFilter: ProjectStatus | ""
  onStatusChange: (value: ProjectStatus | "") => void
  workflowFilter: WorkflowStatus | ""
  onWorkflowChange: (value: WorkflowStatus | "") => void
}) {
  return (
    <>
      <Input
        value={nameFilter}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Buscar por nome..."
        className={stacked ? "w-full" : "flex-1"}
      />
      <div className={stacked ? "w-full" : "w-44"}>
        <StatusFilterSelect value={statusFilter} onValueChange={onStatusChange} />
      </div>
      <div className={stacked ? "w-full" : "w-48"}>
        <WorkflowFilterSelect value={workflowFilter} onValueChange={onWorkflowChange} />
      </div>
    </>
  )
}

function ProjectsPage() {
  useTranslation()
  const { projects, deleteProject } = useProjects()
  const { findContact } = useRegistry()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const navigate = useNavigate()

  const [nameFilter, setNameFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("")
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | "">("")

  function editProject(project: Project) {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const search = nameFilter.trim().toLowerCase()
  const filtered = projects.filter((project) => {
    const clientName = findContact(project.clientId)?.name ?? ""
    // name and client in the same search — someone looking for "Acme" wants the
    // project of client Acme as much as the project named Acme.
    if (
      search &&
      !project.name.toLowerCase().includes(search) &&
      !clientName.toLowerCase().includes(search)
    ) {
      return false
    }
    if (statusFilter && project.status !== statusFilter) return false
    if (workflowFilter && project.repo?.workflow !== workflowFilter) return false
    return true
  })

  const columns: Column<Project>[] = [
    {
      key: "name",
      header: "Projeto",
      sortValue: (project) => project.name,
      cell: (project) => (
        <>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {project.name}
          </Link>
          <div className="text-xs text-muted-foreground">
            {findContact(project.clientId)?.name ?? "—"}
          </div>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (project) => project.status,
      cell: (project) => <StatusBadge status={project.status} />,
    },
    {
      key: "amount",
      header: "Valor",
      className: "hidden sm:table-cell",
      sortValue: (project) => project.deal.amount,
      cell: (project) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDeal(project.deal)}
        </span>
      ),
    },
    {
      key: "tools",
      header: "Ferramentas",
      className: "hidden md:table-cell",
      cell: (project) => (
        <div className="flex flex-wrap gap-1">
          {project.tools.map((tool) => (
            <Badge
              key={`${tool.id}-${tool.name}`}
              variant={tool.billing ? "default" : "outline"}
              title={
                tool.billing
                  ? `Paga · ${formatCurrency(tool.billing.amount, tool.billing.currency)} ${billingCycleLabel(tool.billing.cycle).toLowerCase()}`
                  : "Plano free"
              }
            >
              <ToolIcon id={tool.id} className="size-3" />
              {tool.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "github",
      header: "GitHub",
      className: "hidden lg:table-cell",
      cell: (project) =>
        project.repo ? (
          <div className="group flex items-center gap-2">
            <a
              href={project.repo.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{project.repo.fullName}</span>
            </a>
            <WorkflowBadge status={project.repo.workflow} iconOnly />
            <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right whitespace-nowrap",
      cell: (project) => (
        // clicking the actions must not navigate to the detail page too
        <span onClick={(event) => event.stopPropagation()}>
          <RowActionsMenu
            onEdit={() => editProject(project)}
            onDelete={() => {
              setDeletingProject(project)
              setDeleteDialogOpen(true)
            }}
          />
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Projetos"
        description={`${projects.length} projetos cadastrados.`}
        actions={
          <div className="mt-3 flex w-full gap-2 sm:mt-0 sm:w-auto">
            <Button
              onClick={() => {
                setEditingProject(null)
                setDialogOpen(true)
              }}
              className="flex-1 md:flex-none"
            >
              <Plus />
              Novo projeto
            </Button>
            <FilterDrawer
              hasActive={nameFilter !== "" || statusFilter !== "" || workflowFilter !== ""}
              onClear={() => {
                setNameFilter("")
                setStatusFilter("")
                setWorkflowFilter("")
              }}
            >
              <ProjectFilterFields
                stacked
                nameFilter={nameFilter}
                onNameChange={setNameFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                workflowFilter={workflowFilter}
                onWorkflowChange={setWorkflowFilter}
              />
            </FilterDrawer>
          </div>
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
            <Emphasis className="text-primary">{deletingProject?.name}</Emphasis>
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

      <div className="hidden gap-3 px-4 pt-6 md:flex md:flex-row md:items-center sm:px-6 lg:px-8">
        <ProjectFilterFields
          nameFilter={nameFilter}
          onNameChange={setNameFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          workflowFilter={workflowFilter}
          onWorkflowChange={setWorkflowFilter}
        />
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(project) => project.id}
          initialSort={{ key: "name", direction: "asc" }}
          // mouse convenience; the keyboard navigates through the name link
          onRowClick={(project) =>
            navigate({
              to: "/projects/$projectId",
              params: { projectId: project.id },
            })
          }
          emptyMessage="Nenhum projeto encontrado com esses filtros."
        />
      </div>
    </>
  )
}

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
})
