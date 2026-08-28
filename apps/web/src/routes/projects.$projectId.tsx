import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, RefreshCw, Trash2, User, Wallet, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { compactSearch, invoiceSearchSchema, parseSearch } from "shared";

import { CreateProjectDialog, type ProjectDialogSection } from "@/components/projects/create-project-dialog";
import { InvoicesTable } from "@/components/projects/invoices-table";
import { StatusLabel, WorkflowBadge } from "@/components/projects/status-badges";
import { ToolDetails } from "@/components/projects/tool-details";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Emphasis } from "@/components/ui/emphasis";
import { Tabs, TabsDock, TabsDockTab, TabsPanel } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { isDealFree } from "@/data/projects";
import { freeLabel } from "@/i18n/labels";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrency, formatDealProgress, formatToolsProgress } from "@/lib/format";
import { useProjects } from "@/lib/projects-store";
import { useRegistry } from "@/lib/registry-store";
import { trpc } from "@/lib/trpc";

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
  const { t } = useTranslation();
  return (
    <Link
      to="/projects"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" />
      {t("nav.projects")}
    </Link>
  );
}

function ProjectDetailPage() {
  const { t } = useTranslation();
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { findProject, deleteProject } = useProjects();
  const { findContact } = useRegistry();
  const project = findProject(projectId);
  const [editDialog, setEditDialog] = useState<EditDialogConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const navigate = useNavigate();
  const routeNavigate = Route.useNavigate();

  const invoiceInput = {
    projectId,
    status: search.status,
    monthFrom: search.from,
    monthTo: search.to,
  };
  const invoicesQuery = useQuery({
    queryKey: ["invoices", invoiceInput],
    queryFn: () => trpc.invoices.list.query(invoiceInput),
    placeholderData: keepPreviousData,
    enabled: Boolean(project),
  });

  function openEditDialog(config: EditDialogConfig) {
    setEditDialog(config);
    setDialogOpen(true);
  }

  function removeProject() {
    if (!project) return;
    deleteProject(project.id);
    navigate({ to: "/projects" });
  }

  function patchInvoiceSearch(patch: Partial<typeof search>) {
    void routeNavigate({
      search: (prev) => compactSearch({ ...prev, ...patch }),
      replace: true,
    });
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">{t("projects.notFound")}</p>
        <Button variant="outline" size="sm" render={<Link to="/projects" />}>
          <ArrowLeft />
          {t("projects.backToList")}
        </Button>
      </div>
    );
  }

  const contact = findContact(project.clientId);
  const { deal } = project;
  const invoices = invoicesQuery.data?.items ?? [];
  const totals = invoicesQuery.data?.totals;
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
    .map(([currency, total]) => t("format.amountPerMonth", { amount: formatCurrency(total, currency) }))
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
        title={t("projects.deleteTitle")}
        description={
          <>
            {t("common.delete")} <Emphasis className="text-primary">{project.name}</Emphasis>? {t("common.cannotUndo")}
          </>
        }
        confirmLabel={t("common.delete")}
        confirmWord={t("common.deleteWord")}
        onConfirm={removeProject}
      />

      <div className="border-b px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <BackLink />
          <div className="flex gap-1">
            <Tooltip label={t("projects.refreshProject")} side="top">
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
                  title: t("projects.editTitle"),
                  description: t("projects.editIdentityDescription"),
                })
              }
            >
              <Pencil />
              {t("common.edit")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
              <Trash2 />
              {t("common.delete")}
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <StatusLabel status={project.status} className="text-xl" />
          <h1 className="font-heading text-4xl font-normal tracking-normal sm:text-4xl">{project.name}</h1>
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
          <span>{contact?.name ?? t("common.emDash")}</span>
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

      <div className="px-4 pt-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
        <Tabs defaultValue="finance">
          <TabsDock>
            <TabsDockTab value="finance" icon={Wallet}>
              {t("common.finance")}
            </TabsDockTab>
            <TabsDockTab value="tools" icon={Wrench}>
              {t("common.tools")}
            </TabsDockTab>
          </TabsDock>

          <TabsPanel value="finance" className="pt-4">
            <Card
              action={
                <>
                  <Tooltip label={t("projects.refreshFinance")} side="top">
                    {/* ponytail: no-op — same as the header refresh, no real
                        fetch yet (see the comment further up). */}
                    <Button variant="outline" size="icon-sm" onClick={() => {}}>
                      <RefreshCw />
                    </Button>
                  </Tooltip>
                  <Tooltip label={t("projects.editFinance")} side="top">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        openEditDialog({
                          sections: ["billing"],
                          title: t("projects.editFinance"),
                          description: t("projects.editFinanceDescription"),
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                  </Tooltip>
                </>
              }
            >
              <p className="font-subtitle text-2xl font-semibold tracking-tight">
                {isDealFree(deal) ? freeLabel() : formatCurrency(deal.amount, deal.currency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDealProgress(
                  deal,
                  totals
                    ? { paid: totals.paid, total: totals.count, overdue: totals.overdue }
                    : [],
                )}
              </p>

              {(invoices.length > 0 || invoicesQuery.isPending || invoicesQuery.isFetching) && (
                <InvoicesTable
                  invoices={invoices}
                  status={search.status ?? "all"}
                  monthFrom={search.from ?? ""}
                  monthTo={search.to ?? ""}
                  onStatusChange={(status) =>
                    patchInvoiceSearch({ status: status === "all" ? undefined : status })
                  }
                  onMonthFromChange={(from) => patchInvoiceSearch({ from: from || undefined })}
                  onMonthToChange={(to) => patchInvoiceSearch({ to: to || undefined })}
                  isPending={invoicesQuery.isPending}
                  isFetching={invoicesQuery.isFetching}
                />
              )}
            </Card>
          </TabsPanel>

          <TabsPanel value="tools" className="pt-4">
            <Card
              action={
                <>
                  <Tooltip label={t("projects.refreshTools")} side="top">
                    {/* ponytail: no-op — same as the header refresh, no real
                        fetch yet (see the comment further up). */}
                    <Button variant="outline" size="icon-sm" onClick={() => {}}>
                      <RefreshCw />
                    </Button>
                  </Tooltip>
                  <Tooltip label={t("projects.editTools")} side="top">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        openEditDialog({
                          sections: ["tools"],
                          title: t("projects.editTools"),
                          description: t("projects.editToolsDescription"),
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                  </Tooltip>
                </>
              }
            >
              <p className="font-subtitle text-2xl font-semibold tracking-tight">
                {monthlyCostLabel || (paidTools.length > 0 ? t("projects.noMonthlyBilling") : t("projects.noPaidTools"))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{formatToolsProgress(project.tools)}</p>

              {project.tools.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">{t("projects.noTools")}</p>
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
  validateSearch: (search) => parseSearch(invoiceSearchSchema, search),
  component: ProjectDetailPage,
});
