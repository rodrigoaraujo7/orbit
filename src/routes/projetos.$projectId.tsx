import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ExternalLink } from "lucide-react"
import type { ReactNode } from "react"

import { StatusBadge, WorkflowBadge } from "@/components/projetos/status-badges"
import { ToolDetails } from "@/components/projetos/tool-details"
import { Button } from "@/components/ui/button"
import { DEAL_KIND_LABEL } from "@/data/projects"
import { formatCurrency, formatDeal } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function BackLink() {
  return (
    <Link
      to="/projetos"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" />
      Projetos
    </Link>
  )
}

function ProjetoDetalhePage() {
  const { projectId } = Route.useParams()
  const { findProject } = useProjects()
  const project = findProject(projectId)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">
          Projeto não encontrado.
        </p>
        <Button variant="outline" size="sm" render={<Link to="/projetos" />}>
          <ArrowLeft />
          Voltar pra lista
        </Button>
      </div>
    )
  }

  const { deal } = project
  // "é paga" é derivado de billing — não existe flag separada que possa divergir
  const paidTools = project.tools.filter((tool) => tool.billing)
  const monthlyCost = paidTools
    .filter((tool) => tool.billing?.cycle === "mensal")
    .reduce((total, tool) => total + (tool.billing?.amount ?? 0), 0)

  return (
    <div className="animate-in fade-in duration-300">
      <div className="border-b px-4 py-6 sm:px-6 lg:px-8">
        <BackLink />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{project.client}</p>
      </div>

      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card title="Valor fechado">
          <p className="text-2xl font-semibold tracking-tight">
            {deal.kind === "gratis"
              ? DEAL_KIND_LABEL.gratis
              : formatCurrency(deal.amount ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDeal(deal)}
            {deal.kind === "parcelado" && deal.amount && deal.installments
              ? ` · ${formatCurrency(deal.amount / deal.installments)} por parcela`
              : ""}
          </p>
        </Card>

        <Card title="Repositório">
          {project.repo ? (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={project.repo.url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                {project.repo.fullName}
                <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
              </a>
              <WorkflowBadge status={project.repo.workflow} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum repositório vinculado.
            </p>
          )}
        </Card>

        <Card
          title={
            monthlyCost > 0
              ? `Ferramentas · ${paidTools.length} pagas · ${formatCurrency(monthlyCost)}/mês`
              : `Ferramentas · ${paidTools.length} pagas`
          }
        >
          {project.tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ferramenta registrada.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {project.tools.map((tool) => (
                <ToolDetails key={`${tool.id}-${tool.name}`} tool={tool} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/projetos/$projectId")({
  component: ProjetoDetalhePage,
})
