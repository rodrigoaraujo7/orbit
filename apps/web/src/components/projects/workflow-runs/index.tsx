import { Link } from "@tanstack/react-router"
import { Check, ChevronDown, ExternalLink, GitBranch } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { WorkflowRun } from "shared"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilterPending, TableFilterSkeleton } from "@/components/ui/filter-pending"
import { GitHubIcon } from "@/components/ui/github-icon"
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/table"
import { formatDuration, formatRelativeTime } from "@/lib/format"
import { WorkflowBadge } from "../status-badges"

/** Nothing to show yet: no repository, no connection, or the call failed. */
export function WorkflowRunsEmpty({
  message,
  action,
}: {
  message: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <GitHubIcon className="size-6 text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button variant="outline" size="sm" render={<Link to={action.to} />}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

function BranchSelect({
  branches,
  defaultBranch,
  value,
  onValueChange,
  disabled,
}: {
  branches: string[]
  defaultBranch: string
  value: string
  onValueChange: (branch: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  // A branch pinned in the URL may no longer exist on GitHub — keep it
  // selectable so the page does not silently jump to another branch.
  const options = branches.includes(value) ? branches : [value, ...branches].filter(Boolean)

  return (
    <SelectRoot
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      disabled={disabled}
    >
      <SelectTrigger aria-label={t("github.branch")}>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) => (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected || t("github.branch")}</span>
            </span>
          )}
        </SelectValue>
        <SelectIcon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-[60] w-[var(--anchor-width)]"
        >
          <SelectPopup>
            {options.map((branch) => (
              <SelectItem key={branch} value={branch}>
                <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectItemText>{branch}</SelectItemText>
                {branch === defaultBranch && (
                  <Badge variant="outline">{t("github.defaultBranch")}</Badge>
                )}
                <SelectItemIndicator className="ml-auto">
                  <Check className="size-3.5 text-primary" />
                </SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  )
}

export function WorkflowRunsTable({
  runs,
  branches,
  branch,
  defaultBranch,
  onBranchChange,
  isPending,
  isFetching,
}: {
  runs: WorkflowRun[]
  branches: string[]
  branch: string
  defaultBranch: string
  onBranchChange: (branch: string) => void
  isPending: boolean
  isFetching: boolean
}) {
  const { t } = useTranslation()

  const columns: Column<WorkflowRun>[] = [
    {
      key: "status",
      header: t("common.status"),
      sortValue: (run) => run.status,
      cell: (run) => <WorkflowBadge status={run.status} />,
    },
    {
      key: "name",
      header: t("github.run"),
      sortValue: (run) => run.name,
      cell: (run) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{run.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {t("github.runNumber", { number: run.runNumber })} · {run.event}
          </span>
        </div>
      ),
    },
    {
      key: "commit",
      header: t("github.commit"),
      className: "hidden md:table-cell",
      sortValue: (run) => run.title,
      cell: (run) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{run.title}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{run.sha}</span>
        </div>
      ),
    },
    {
      key: "actor",
      header: t("github.actor"),
      className: "hidden lg:table-cell",
      sortValue: (run) => run.actor,
      cell: (run) => <span className="text-muted-foreground">{run.actor}</span>,
    },
    {
      key: "started",
      header: t("github.started"),
      sortValue: (run) => run.startedAt,
      cell: (run) => (
        <span className="text-muted-foreground">{formatRelativeTime(run.startedAt)}</span>
      ),
    },
    {
      key: "duration",
      header: t("github.duration"),
      className: "hidden sm:table-cell",
      sortValue: (run) => run.durationMs ?? 0,
      cell: (run) => (
        <span className="text-muted-foreground">
          {run.durationMs === null ? t("common.emDash") : formatDuration(run.durationMs)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      cell: (run) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("github.openRun")}
          render={<a href={run.url} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink />
        </Button>
      ),
    },
  ]

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <BranchSelect
            branches={branches}
            defaultBranch={defaultBranch}
            value={branch}
            onValueChange={onBranchChange}
            disabled={branches.length === 0}
          />
        </div>
      </div>

      <FilterPending
        isPending={isPending}
        isFetching={isFetching}
        skeleton={<TableFilterSkeleton rows={5} />}
      >
        <DataTable
          data={runs}
          columns={columns}
          rowKey={(run) => String(run.id)}
          emptyMessage={t("github.noRuns")}
        />
      </FilterPending>
    </div>
  )
}
