import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Pencil, Trash2, User } from "lucide-react"
import { useState, type ReactNode } from "react"

import { CreateProjectDialog } from "@/components/projetos/create-project-dialog"
import { InvoiceCard } from "@/components/projetos/invoice-card"
import { StatusBadge, WorkflowBadge } from "@/components/projetos/status-badges"
import { ToolDetails } from "@/components/projetos/tool-details"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FREE_LABEL, isDealFree } from "@/data/projects"
import { DEFAULT_CURRENCY } from "@/lib/currency"
import { formatCurrency, formatDeal } from "@/lib/format"
import { generateInvoices } from "@/lib/invoices"
import { useProjects } from "@/lib/projects-store"

// lucide-react não tem o logo de marca do GitHub — svg oficial inline.
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  )
}

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
  const { findProject, deleteProject } = useProjects()
  const project = findProject(projectId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const navigate = useNavigate()

  function removeProject() {
    if (!project) return
    deleteProject(project.id)
    navigate({ to: "/projetos" })
  }

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
  const invoices = generateInvoices(project)
  // "é paga" é derivado de billing — não existe flag separada que possa divergir
  const paidTools = project.tools.filter((tool) => tool.billing)
  // agrupado por moeda — ferramentas de moedas diferentes não podem ser
  // somadas num total único.
  const monthlyCostByCurrency = paidTools
    .filter((tool) => tool.billing?.cycle === "mensal")
    .reduce<Record<string, number>>((totals, tool) => {
      const { amount, currency = DEFAULT_CURRENCY } = tool.billing!
      totals[currency] = (totals[currency] ?? 0) + amount
      return totals
    }, {})
  const monthlyCostLabel = Object.entries(monthlyCostByCurrency)
    .map(([currency, total]) => `${formatCurrency(total, currency)}/mês`)
    .join(" + ")

  return (
    <div className="animate-in fade-in duration-300">
      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={project}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Excluir projeto"
        description={
          <>
            Excluir{" "}
            <span className="font-medium text-primary">{project.name}</span>
            ? Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        confirmWord="excluir"
        onConfirm={removeProject}
      />

      <div className="border-b px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <BackLink />
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Pencil />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 />
              Excluir
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
        </div>
        {project.repo && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={project.repo.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GitHubIcon className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
              {project.repo.fullName}
            </a>
            <WorkflowBadge status={project.repo.workflow} iconOnly tooltip />
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <User className="size-3.5" />
          <span>{project.client}</span>
          {project.clientEmail && (
            <>
              <span aria-hidden="true">·</span>
              <span>{project.clientEmail}</span>
            </>
          )}
          {project.clientPhone && (
            <>
              <span aria-hidden="true">·</span>
              <span>{project.clientPhone}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card title="Valor fechado">
          <p className="text-2xl font-semibold tracking-tight">
            {isDealFree(deal) ? FREE_LABEL : formatCurrency(deal.amount, deal.currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDeal(deal)}
            {deal.kind === "parcelado" && !isDealFree(deal) && deal.installments
              ? ` · ${formatCurrency(deal.amount / deal.installments, deal.currency)} por parcela`
              : ""}
          </p>

          {invoices.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <InvoiceCard invoice={invoice} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            monthlyCostLabel
              ? `Ferramentas · ${paidTools.length} pagas · ${monthlyCostLabel}`
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
