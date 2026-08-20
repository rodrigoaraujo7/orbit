import { Check, ChevronDown, Circle, CircleCheck, CircleX, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
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
} from "@/components/ui/select";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  WORKFLOW_STATUS_LABEL,
  WORKFLOW_STATUS_TOOLTIP,
  type ProjectStatus,
  type WorkflowStatus,
} from "@/data/projects";
import { cn } from "@/lib/utils";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  queued: "muted",
  "in-development": "default",
  paused: "warning",
  "in-validation": "outline",
  completed: "success",
};

// same color as the badge dot, but in bg-* so it becomes a dot — both readings
// (badge and select) share this source so a status never drifts in color
// between places.
const STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  queued: "bg-muted-foreground",
  "in-development": "bg-primary",
  paused: "bg-warning",
  "in-validation": "bg-foreground/50",
  completed: "bg-success",
};

export function StatusDot({ status }: { status: ProjectStatus }) {
  return <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT_CLASS[status])} />;
}

// same color as the dot (`STATUS_DOT_CLASS`), in text-* for plain-text labels.
const STATUS_TEXT_CLASS: Record<ProjectStatus, string> = {
  queued: "text-muted-foreground",
  "in-development": "text-primary",
  paused: "text-warning",
  "in-validation": "text-foreground/70",
  completed: "text-success",
};

/** Status como texto simples (sem badge) — usado acima do título do projeto. */
export function StatusLabel({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span className={cn("font-heading italic tracking-wider", STATUS_TEXT_CLASS[status], className)}>
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

const WORKFLOW_VARIANT: Record<WorkflowStatus, BadgeVariant> = {
  success: "success",
  failure: "destructive",
  running: "warning",
  none: "muted",
};

const WORKFLOW_ICON: Record<WorkflowStatus, typeof Circle> = {
  success: CircleCheck,
  failure: CircleX,
  running: LoaderCircle,
  none: Circle,
};

// same color as the badge (`WORKFLOW_VARIANT`), in text-* for the select icon.
const WORKFLOW_ICON_COLOR_CLASS: Record<WorkflowStatus, string> = {
  success: "text-success",
  failure: "text-destructive",
  running: "text-warning",
  none: "text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function WorkflowBadge({
  status,
  iconOnly = false,
  tooltip = false,
}: {
  status: WorkflowStatus;
  iconOnly?: boolean;
  tooltip?: boolean;
}) {
  const Icon = WORKFLOW_ICON[status];
  const badge = (
    <Badge variant={WORKFLOW_VARIANT[status]} className={iconOnly ? "p-1" : undefined}>
      <Icon className={status === "running" ? "animate-spin" : undefined} />
      {!iconOnly && WORKFLOW_STATUS_LABEL[status]}
    </Badge>
  );
  return iconOnly && tooltip ? (
    <Tooltip label={WORKFLOW_STATUS_TOOLTIP[status]} side="right">
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}

/**
 * Status select with a dot in the status color next to the name — the same
 * pieces from `ui/select.tsx`, composed by hand instead of the generic `Select`
 * because the dot does not fit in a plain `SelectOption`.
 */
export function StatusSelect({
  id,
  value,
  onValueChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
}: {
  id?: string;
  value: ProjectStatus;
  onValueChange: (value: ProjectStatus) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <SelectRoot value={value} onValueChange={(next) => onValueChange(next as ProjectStatus)}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={describedBy}>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: ProjectStatus | null) =>
            selected && (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <StatusDot status={selected} />
                <span className="truncate">{PROJECT_STATUS_LABEL[selected]}</span>
              </span>
            )
          }
        </SelectValue>
        <SelectIcon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner sideOffset={4} alignItemWithTrigger={false} className="z-[60] w-[var(--anchor-width)]">
          <SelectPopup>
            {PROJECT_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                <StatusDot status={status} />
                <SelectItemText>{PROJECT_STATUS_LABEL[status]}</SelectItemText>
                <SelectItemIndicator className="ml-auto">
                  <Check className="size-3.5 text-primary" />
                </SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

/**
 * Same select as above, but with an "all" option — for the table filter, which
 * needs to be able to go back to having no status selected.
 */
export function StatusFilterSelect({
  value,
  onValueChange,
}: {
  value: ProjectStatus | "";
  onValueChange: (value: ProjectStatus | "") => void;
}) {
  return (
    <SelectRoot
      value={value || "all"}
      onValueChange={(next) => onValueChange(next === "all" ? "" : (next as ProjectStatus))}
    >
      <SelectTrigger>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) =>
            selected && selected !== "all" ? (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <StatusDot status={selected as ProjectStatus} />
                <span className="truncate">{PROJECT_STATUS_LABEL[selected as ProjectStatus]}</span>
              </span>
            ) : (
              "Status"
            )
          }
        </SelectValue>
        <SelectIcon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner sideOffset={4} alignItemWithTrigger={false} className="z-[60] w-[var(--anchor-width)]">
          <SelectPopup>
            <SelectItem value="all">
              <SelectItemText>Todos</SelectItemText>
              <SelectItemIndicator className="ml-auto">
                <Check className="size-3.5 text-primary" />
              </SelectItemIndicator>
            </SelectItem>
            {PROJECT_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                <StatusDot status={status} />
                <SelectItemText>{PROJECT_STATUS_LABEL[status]}</SelectItemText>
                <SelectItemIndicator className="ml-auto">
                  <Check className="size-3.5 text-primary" />
                </SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

const WORKFLOW_STATUS_ORDER: WorkflowStatus[] = ["success", "failure", "running", "none"];

/** GitHub Actions status filter select, with the same icon as the badge. */
export function WorkflowFilterSelect({
  value,
  onValueChange,
}: {
  value: WorkflowStatus | "";
  onValueChange: (value: WorkflowStatus | "") => void;
}) {
  return (
    <SelectRoot
      value={value || "all"}
      onValueChange={(next) => onValueChange(next === "all" ? "" : (next as WorkflowStatus))}
    >
      <SelectTrigger>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) => {
            if (!selected || selected === "all") return "GitHub Actions";
            const status = selected as WorkflowStatus;
            const Icon = WORKFLOW_ICON[status];
            return (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    WORKFLOW_ICON_COLOR_CLASS[status],
                    status === "running" && "animate-spin",
                  )}
                />
                <span className="truncate">{WORKFLOW_STATUS_LABEL[status]}</span>
              </span>
            );
          }}
        </SelectValue>
        <SelectIcon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner sideOffset={4} alignItemWithTrigger={false} className="z-[60] w-[var(--anchor-width)]">
          <SelectPopup>
            <SelectItem value="all">
              <SelectItemText>Todos</SelectItemText>
              <SelectItemIndicator className="ml-auto">
                <Check className="size-3.5 text-primary" />
              </SelectItemIndicator>
            </SelectItem>
            {WORKFLOW_STATUS_ORDER.map((status) => {
              const Icon = WORKFLOW_ICON[status];
              return (
                <SelectItem key={status} value={status}>
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      WORKFLOW_ICON_COLOR_CLASS[status],
                      status === "running" && "animate-spin",
                    )}
                  />
                  <SelectItemText>{WORKFLOW_STATUS_LABEL[status]}</SelectItemText>
                  <SelectItemIndicator className="ml-auto">
                    <Check className="size-3.5 text-primary" />
                  </SelectItemIndicator>
                </SelectItem>
              );
            })}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}
