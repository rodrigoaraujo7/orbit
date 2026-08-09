import {
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleX,
  LoaderCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  WORKFLOW_STATUS_LABEL,
  type ProjectStatus,
  type WorkflowStatus,
} from "@/data/projects"
import { cn } from "@/lib/utils"

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"]

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  "em-desenvolvimento": "default",
  fila: "muted",
  pausado: "warning",
  concluido: "success",
}

// mesma cor da bolinha do badge, mas em bg-* pra virar um ponto — as duas
// leituras (badge e select) compartilham essa fonte pro status não divergir
// de cor entre lugares.
const STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  "em-desenvolvimento": "bg-primary",
  fila: "bg-muted-foreground",
  pausado: "bg-warning",
  concluido: "bg-success",
}

export function StatusDot({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", STATUS_DOT_CLASS[status])}
    />
  )
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

// mesma cor do badge (`WORKFLOW_VARIANT`), em text-* pro ícone do select.
const WORKFLOW_ICON_COLOR_CLASS: Record<WorkflowStatus, string> = {
  success: "text-success",
  failure: "text-destructive",
  running: "text-warning",
  none: "text-muted-foreground",
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  )
}

export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const Icon = WORKFLOW_ICON[status]
  return (
    <Badge variant={WORKFLOW_VARIANT[status]}>
      <Icon className={status === "running" ? "animate-spin" : undefined} />
      {WORKFLOW_STATUS_LABEL[status]}
    </Badge>
  )
}

/**
 * Select de status com uma bolinha da cor do status ao lado do nome — mesmas
 * peças de `ui/select.tsx`, composto na mão em vez do `Select` genérico
 * porque a bolinha não cabe num `SelectOption` simples.
 */
export function StatusSelect({
  id,
  value,
  onValueChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
}: {
  id?: string
  value: ProjectStatus
  onValueChange: (value: ProjectStatus) => void
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  return (
    <SelectRoot
      value={value}
      onValueChange={(next) => onValueChange(next as ProjectStatus)}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={describedBy}
      >
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: ProjectStatus | null) =>
            selected && (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <StatusDot status={selected} />
                <span className="truncate">
                  {PROJECT_STATUS_LABEL[selected]}
                </span>
              </span>
            )
          }
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
  )
}

/**
 * Mesmo select acima, mas com opção "Todos" — pro filtro da tabela, que
 * precisa poder voltar pro estado sem status selecionado.
 */
export function StatusFilterSelect({
  value,
  onValueChange,
}: {
  value: ProjectStatus | ""
  onValueChange: (value: ProjectStatus | "") => void
}) {
  return (
    <SelectRoot
      value={value || "all"}
      onValueChange={(next) =>
        onValueChange(next === "all" ? "" : (next as ProjectStatus))
      }
    >
      <SelectTrigger>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) =>
            selected && selected !== "all" ? (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <StatusDot status={selected as ProjectStatus} />
                <span className="truncate">
                  {PROJECT_STATUS_LABEL[selected as ProjectStatus]}
                </span>
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
        <SelectPositioner
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-[60] w-[var(--anchor-width)]"
        >
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
  )
}

const WORKFLOW_STATUS_ORDER: WorkflowStatus[] = [
  "success",
  "failure",
  "running",
  "none",
]

/** Select do filtro de status do GitHub Actions, com o mesmo ícone do badge. */
export function WorkflowFilterSelect({
  value,
  onValueChange,
}: {
  value: WorkflowStatus | ""
  onValueChange: (value: WorkflowStatus | "") => void
}) {
  return (
    <SelectRoot
      value={value || "all"}
      onValueChange={(next) =>
        onValueChange(next === "all" ? "" : (next as WorkflowStatus))
      }
    >
      <SelectTrigger>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) => {
            if (!selected || selected === "all") return "GitHub Actions"
            const status = selected as WorkflowStatus
            const Icon = WORKFLOW_ICON[status]
            return (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    WORKFLOW_ICON_COLOR_CLASS[status],
                    status === "running" && "animate-spin"
                  )}
                />
                <span className="truncate">
                  {WORKFLOW_STATUS_LABEL[status]}
                </span>
              </span>
            )
          }}
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
            <SelectItem value="all">
              <SelectItemText>Todos</SelectItemText>
              <SelectItemIndicator className="ml-auto">
                <Check className="size-3.5 text-primary" />
              </SelectItemIndicator>
            </SelectItem>
            {WORKFLOW_STATUS_ORDER.map((status) => {
              const Icon = WORKFLOW_ICON[status]
              return (
                <SelectItem key={status} value={status}>
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      WORKFLOW_ICON_COLOR_CLASS[status],
                      status === "running" && "animate-spin"
                    )}
                  />
                  <SelectItemText>
                    {WORKFLOW_STATUS_LABEL[status]}
                  </SelectItemText>
                  <SelectItemIndicator className="ml-auto">
                    <Check className="size-3.5 text-primary" />
                  </SelectItemIndicator>
                </SelectItem>
              )
            })}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  )
}
