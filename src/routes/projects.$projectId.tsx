import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, RefreshCw, Trash2, User, Wallet, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";

import { CreateProjectDialog, type ProjectDialogSection } from "@/components/projects/create-project-dialog";
import { InvoicesTable } from "@/components/projects/invoices-table";
import { StatusBadge, WorkflowBadge } from "@/components/projects/status-badges";
import { ToolDetails } from "@/components/projects/tool-details";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { FREE_LABEL, isDealFree } from "@/data/projects";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrency, formatDealProgress, formatToolsProgress } from "@/lib/format";
import { generateInvoices } from "@/lib/invoices";
import { useProjects } from "@/lib/projects-store";
import { useRegistry } from "@/lib/registry-store";

// lucide-react has no GitHub brand logo — official svg inlined.
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  );
}

function Card({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative rounded-xl border p-4">
      {action && <div className="absolute top-3 right-3 flex gap-1">{action}</div>}
      {children}
    </section>
  );
}

type EditDialogConfig = {
  sections: ProjectDialogSection[];
  title: string;
  description?: string;
};

function BackLink() {
  return (
    <Link
      to="/projects"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" />
      Projetos
    </Link>
  );
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { findProject, deleteProject } = useProjects();
  const { findContact } = useRegistry();
  const project = findProject(projectId);
  // `editDialog` holds the last config used (title/sections) and is never
  // cleared on close — it only changes when an edit button opens the dialog
  // again. `dialogOpen` controls visibility alone. If `editDialog` were reset on
  // close, `sections` would fall back to the default (all of them) while the
  // modal is still playing its exit animation (~200ms), and the whole form
  // would flash on screen before disappearing.
  const [editDialog, setEditDialog] = useState<EditDialogConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  function openEditDialog(config: EditDialogConfig) {
    setEditDialog(config);
    setDialogOpen(true);
  }

  function removeProject() {
    if (!project) return;
    deleteProject(project.id);
    navigate({ to: "/projects" });
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="outline" size="sm" render={<Link to="/projects" />}>
          <ArrowLeft />
          Voltar pra lista
        </Button>
      </div>
    );
  }

  const contact = findContact(project.clientId);
  const { deal } = project;
  const invoices = generateInvoices(project, contact?.name ?? "—");
  // "is paid" is derived from billing — no separate flag that could drift
  const paidTools = project.tools.filter((tool) => tool.billing);
  // grouped by currency — tools in different currencies cannot be added up
  // into a single total.
  const monthlyCostByCurrency = paidTools
    .filter((tool) => tool.billing?.cycle === "monthly")
    .reduce<Record<string, number>>((totals, tool) => {
      const { amount, currency = DEFAULT_CURRENCY } = tool.billing!;
      totals[currency] = (totals[currency] ?? 0) + amount;
      return totals;
    }, {});
  const monthlyCostLabel = Object.entries(monthlyCostByCurrency)
    .map(([currency, total]) => `${formatCurrency(total, currency)}/mês`)
    .join(" + ");

  return (
    <div className="animate-in fade-in duration-300">
      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={project}
        sections={editDialog?.sections}
        title={editDialog?.title}
        description={editDialog?.description}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Excluir projeto"
        description={
          <>
            Excluir <span className="font-medium text-primary">{project.name}</span>? Essa ação não pode ser desfeita.
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
            <Tooltip label="Atualizar dados do projeto" side="top">
              {/* ponytail: no-op — there is no real fetch yet (in-memory
                  state, see projects-store.tsx). Plug in a refetch once the
                  API exists. */}
              <Button variant="outline" size="icon-sm" onClick={() => {}}>
                <RefreshCw />
              </Button>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openEditDialog({
                  sections: ["identity", "contact", "repository"],
                  title: "Editar projeto",
                  description: "Atualize nome, status, contato e repositório.",
                })
              }
            >
              <Pencil />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
              <Trash2 />
              Excluir
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h1>
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
          <span>{contact?.name ?? "—"}</span>
          {contact?.email && (
            <>
              <span aria-hidden="true">·</span>
              <span>{contact.email}</span>
            </>
          )}
          {contact?.phone && (
            <>
              <span aria-hidden="true">·</span>
              <span>{contact.phone}</span>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="finance">
          <TabsList>
            <TabsTab value="finance">
              <Wallet />
              Financeiro
            </TabsTab>
            <TabsTab value="tools">
              <Wrench />
              Ferramentas
            </TabsTab>
          </TabsList>

          <TabsPanel value="finance" className="pt-4">
            <Card
              action={
                <>
                  <Tooltip label="Atualizar financeiro" side="top">
                    {/* ponytail: no-op — same as the header refresh, no real
                        fetch yet (see the comment further up). */}
                    <Button variant="outline" size="icon-sm" onClick={() => {}}>
                      <RefreshCw />
                    </Button>
                  </Tooltip>
                  <Tooltip label="Editar financeiro" side="top">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        openEditDialog({
                          sections: ["billing"],
                          title: "Editar financeiro",
                          description: "Atualize o valor e a forma de cobrança.",
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                  </Tooltip>
                </>
              }
            >
              <p className="text-2xl font-semibold tracking-tight">
                {isDealFree(deal) ? FREE_LABEL : formatCurrency(deal.amount, deal.currency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{formatDealProgress(deal, invoices)}</p>

              {invoices.length > 0 && <InvoicesTable invoices={invoices} />}
            </Card>
          </TabsPanel>

          <TabsPanel value="tools" className="pt-4">
            <Card
              action={
                <>
                  <Tooltip label="Atualizar ferramentas" side="top">
                    {/* ponytail: no-op — same as the header refresh, no real
                        fetch yet (see the comment further up). */}
                    <Button variant="outline" size="icon-sm" onClick={() => {}}>
                      <RefreshCw />
                    </Button>
                  </Tooltip>
                  <Tooltip label="Editar ferramentas" side="top">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        openEditDialog({
                          sections: ["tools"],
                          title: "Editar ferramentas",
                          description: "Atualize as ferramentas usadas no projeto.",
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                  </Tooltip>
                </>
              }
            >
              <p className="text-2xl font-semibold tracking-tight">
                {monthlyCostLabel || (paidTools.length > 0 ? "Sem cobrança mensal" : "Nenhuma ferramenta paga")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{formatToolsProgress(project.tools)}</p>

              {project.tools.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Nenhuma ferramenta registrada.</p>
              ) : (
                <ul className="mt-4 flex flex-col divide-y">
                  {project.tools.map((tool) => (
                    <ToolDetails key={`${tool.id}-${tool.name}`} tool={tool} />
                  ))}
                </ul>
              )}
            </Card>
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailPage,
});
