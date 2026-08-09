import { createFileRoute } from "@tanstack/react-router"
import {
  Circle,
  CircleCheck,
  CircleX,
  ExternalLink,
  LoaderCircle,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page"
import { Badge } from "@/components/ui/badge"
import {
  PROJECT_STATUS_LABEL,
  WORKFLOW_STATUS_LABEL,
  projects,
  type ProjectStatus,
  type WorkflowStatus,
} from "@/data/projects"

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"]

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  "em-desenvolvimento": "default",
  fila: "muted",
  pausado: "warning",
  concluido: "success",
}

const WORKFLOW_VARIANT: Record<WorkflowStatus, BadgeVariant> = {
  success: "success",
  failure: "destructive",
  running: "warning",
  none: "muted",
}

const WORKFLOW_ICON: Record<WorkflowStatus, typeof Circle> = {
  success: CircleCheck,
  failure: CircleX,
  running: LoaderCircle,
  none: Circle,
}

function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const Icon = WORKFLOW_ICON[status]
  return (
    <Badge variant={WORKFLOW_VARIANT[status]}>
      <Icon className={status === "running" ? "animate-spin" : undefined} />
      {WORKFLOW_STATUS_LABEL[status]}
    </Badge>
  )
}

function ProjetosPage() {
  return (
    <>
      <PageHeader
        title="Projetos"
        description={`${projects.length} projetos cadastrados.`}
      />

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
                  className="animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards border-b transition-colors duration-500 last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {project.client}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[project.status]}>
                      {PROJECT_STATUS_LABEL[project.status]}
                    </Badge>
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {project.tools.map((tool) => (
                        <Badge
                          key={tool.name}
                          variant={tool.paid ? "default" : "outline"}
                          title={tool.paid ? "Ferramenta paga" : "Plano free"}
                        >
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 lg:table-cell">
                    {project.repo ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={project.repo.url}
                          target="_blank"
                          rel="noreferrer"
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

export const Route = createFileRoute("/projetos")({
  component: ProjetosPage,
})
