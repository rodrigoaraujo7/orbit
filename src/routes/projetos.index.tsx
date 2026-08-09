import { useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ExternalLink, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page"
import { CreateProjectDialog } from "@/components/projetos/create-project-dialog"
import {
  StatusBadge,
  WorkflowBadge,
} from "@/components/projetos/status-badges"
import { ToolIcon } from "@/components/projetos/tool-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BILLING_CYCLE_LABEL } from "@/data/projects"
import { formatCurrency, formatDeal } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"

function ProjetosPage() {
  const { projects } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Projetos"
        description={`${projects.length} projetos cadastrados.`}
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

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Projeto
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground sm:table-cell">
                  Valor
                </th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground md:table-cell">
                  Ferramentas
                </th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground lg:table-cell">
                  GitHub
                </th>
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
                                ? `Paga · ${formatCurrency(tool.billing.amount)} ${BILLING_CYCLE_LABEL[tool.billing.cycle].toLowerCase()}`
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
                      <div className="flex items-center gap-2">
                        <a
                          href={project.repo.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="group inline-flex items-center gap-1.5 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="truncate">
                            {project.repo.fullName.split("/")[1]}
                          </span>
                          <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                        </a>
                        <WorkflowBadge status={project.repo.workflow} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/projetos/")({
  component: ProjetosPage,
})
