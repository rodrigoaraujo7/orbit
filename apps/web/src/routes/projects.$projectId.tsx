import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ArrowLeft, GitBranch, Pencil, RefreshCw, Trash2, User, Wallet, Wrench } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { compactSearch, githubRepoHref, parseSearch, projectDetailSearchSchema } from "shared"

import {
  CreateProjectDialog,
  type ProjectDialogSection,
} from "@/components/projects/create-project-dialog"
import { InvoicesTable } from "@/components/projects/invoices-table"
import { StatusLabel, WorkflowBadge } from "@/components/projects/status-badges"
import { ToolDetails } from "@/components/projects/tool-details"
import { WorkflowRunsEmpty, WorkflowRunsTable } from "@/components/projects/workflow-runs"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Emphasis } from "@/components/ui/emphasis"
import { GitHubIcon } from "@/components/ui/github-icon"
import { Tabs, TabsDock, TabsDockTab, TabsPanel } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { isDealFree } from "@/data/projects"
import { freeLabel } from "@/i18n/labels"
import { DEFAULT_CURRENCY } from "@/lib/currency"
import { formatCurrency, formatDealProgress, formatToolsProgress } from "@/lib/format"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { trpc } from "@/lib/trpc"

function Card({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative rounded-xl border p-4">
      {action && <div className="absolute top-3 right-3 flex gap-1">{action}</div>}
      {children}
    </section>
  )
}

type EditDialogConfig = {
  sections: ProjectDialogSection[]
  title: string
  description?: string
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/projects"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" />
      {t("nav.projects")}
    </Link>
  )
}

function ProjectDetailPage() {
  const { t } = useTranslation()
  const { projectId } = Route.useParams()
  const search = Route.useSearch()
  const { findProject, deleteProject } = useProjects()
  const { findContact } = useRegistry()
  const project = findProject(projectId)
  const [editDialog, setEditDialog] = useState<EditDialogConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const navigate = useNavigate()
  const routeNavigate = Route.useNavigate()

  const invoiceInput = {
    projectId,
    status: search.status,
    monthFrom: search.from,
    monthTo: search.to,
  }
  const invoicesQuery = useQuery({
    queryKey: ["invoices", invoiceInput],
    queryFn: () => trpc.invoices.list.query(invoiceInput),
    placeholderData: keepPreviousData,
    enabled: Boolean(project),
  })

  const repoFullName = project?.repo?.fullName ?? ""
  const githubQuery = useQuery({
    queryKey: ["github", "status"],
    queryFn: () => trpc.github.status.query(),
  })
  const connected = githubQuery.data?.connected ?? false

  const repoQuery = useQuery({
    queryKey: ["github", "repo", projectId],
    queryFn: () => trpc.github.repo.query({ projectId }),
    enabled: connected && Boolean(repoFullName),
    retry: false,
  })

  const branch = search.branch ?? ""
  const runsKey = ["github", "runs", projectId, branch] as const
  const runsQuery = useQuery({
    queryKey: runsKey,
    queryFn: () => trpc.github.runs.query({ projectId, branch: branch || undefined }),
    enabled: connected && Boolean(repoFullName),
    placeholderData: keepPreviousData,
    retry: false,
  })

  // The URL may hold no branch at all; the server answers with the default one.
  const activeBranch = runsQuery.data?.branch ?? branch

  function refreshGithub() {
    void repoQuery.refetch()
    void runsQuery.refetch()
  }

  function selectBranch(next: string) {
    patchSearch({ branch: next === repoQuery.data?.defaultBranch ? undefined : next })
  }

  function openEditDialog(config: EditDialogConfig) {
    setEditDialog(config)
    setDialogOpen(true)
  }

  function removeProject() {
    /* v8 ignore next -- delete control is only rendered when the project exists */
    if (!project) return
    deleteProject(project.id)
    navigate({ to: "/projects" })
  }

  function patchSearch(patch: Partial<typeof search>) {
    void routeNavigate({
      search: (prev) => compactSearch({ ...prev, ...patch }),
      replace: true,
    })
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
    )
  }

  const contact = findContact(project.clientId)
  const { deal } = project
  const invoices = invoicesQuery.data?.items ?? []
  const totals = invoicesQuery.data?.totals
  // "is paid" is derived from billing — no separate flag that could drift
  const paidTools = project.tools.filter((tool) => tool.billing)
  // grouped by currency — tools in different currencies cannot be added up
  // into a single total.
  const monthlyCostByCurrency = paidTools
    .filter((tool) => tool.billing?.cycle === "monthly")
    .reduce<Record<string, number>>((totals, tool) => {
      const { amount, currency = DEFAULT_CURRENCY } = tool.billing!
      totals[currency] = (totals[currency] ?? 0) + amount
      return totals
    }, {})
  const monthlyCostLabel = Object.entries(monthlyCostByCurrency)
    .map(([currency, total]) =>
      t("format.amountPerMonth", { amount: formatCurrency(total, currency) }),
    )
    .join(" + ")

  // Status of the default branch from this page load; otherwise the value the
  // server cached the last time it was, which is what the list shows too.
  const headerWorkflow =
    runsQuery.data?.isDefaultBranch && project.repo
      ? runsQuery.data.workflow
      : (project.repo?.workflow ?? "none")

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
            {t("common.delete")} <Emphasis className="text-primary">{project.name}</Emphasis>?{" "}
            {t("common.cannotUndo")}
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
              <Button variant="outline" size="icon-sm" onClick={refreshGithub}>
                <RefreshCw className={runsQuery.isFetching ? "animate-spin" : undefined} />
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
          <h1 className="font-heading text-4xl font-normal tracking-normal sm:text-4xl">
            {project.name}
          </h1>
        </div>
        {project.repo && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={githubRepoHref(project.repo.fullName)}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GitHubIcon className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
              {project.repo.fullName}
            </a>
            <WorkflowBadge status={headerWorkflow} iconOnly tooltip />
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
            <TabsDockTab value="github" icon={GitBranch}>
              {t("github.tab")}
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
                  totals ? { paid: totals.paid, total: totals.count, overdue: totals.overdue } : [],
                )}
              </p>

              {(invoices.length > 0 || invoicesQuery.isPending || invoicesQuery.isFetching) && (
                <InvoicesTable
                  invoices={invoices}
                  status={search.status ?? "all"}
                  monthFrom={search.from ?? ""}
                  monthTo={search.to ?? ""}
                  onStatusChange={(status) =>
                    patchSearch({ status: status === "all" ? undefined : status })
                  }
                  onMonthFromChange={(from) => patchSearch({ from: from || undefined })}
                  onMonthToChange={(to) => patchSearch({ to: to || undefined })}
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
                {monthlyCostLabel ||
                  (paidTools.length > 0
                    ? t("projects.noMonthlyBilling")
                    : t("projects.noPaidTools"))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatToolsProgress(project.tools)}
              </p>

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

          <TabsPanel value="github" className="pt-4">
            <Card
              action={
                <Tooltip label={t("projects.refreshProject")} side="top">
                  <Button variant="outline" size="icon-sm" onClick={refreshGithub}>
                    <RefreshCw className={runsQuery.isFetching ? "animate-spin" : undefined} />
                  </Button>
                </Tooltip>
              }
            >
              <p className="font-subtitle text-2xl font-semibold tracking-tight">
                {project.repo?.fullName ?? t("kanban.noRepository")}
              </p>

              {!project.repo && <WorkflowRunsEmpty message={t("github.noRepository")} />}

              {project.repo && !connected && (
                <WorkflowRunsEmpty
                  message={t("github.connectPrompt")}
                  action={{ label: t("github.goToSettings"), to: "/settings" }}
                />
              )}

              {project.repo && connected && runsQuery.isError && (
                <WorkflowRunsEmpty message={t("github.loadError")} />
              )}

              {project.repo && connected && !runsQuery.isError && (
                <WorkflowRunsTable
                  runs={runsQuery.data?.runs ?? []}
                  branches={repoQuery.data?.branches ?? []}
                  branch={activeBranch}
                  defaultBranch={runsQuery.data?.defaultBranch ?? ""}
                  onBranchChange={selectBranch}
                  isPending={runsQuery.isPending}
                  isFetching={runsQuery.isFetching}
                />
              )}
            </Card>
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/projects/$projectId")({
  validateSearch: (search) => parseSearch(projectDetailSearchSchema, search),
  component: ProjectDetailPage,
})
