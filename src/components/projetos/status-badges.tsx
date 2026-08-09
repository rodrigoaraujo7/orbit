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

function StatusDot({ status }: { status: ProjectStatus }) {
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
        <SelectValue>
          {(selected: ProjectStatus | null) =>
            selected && (
              <span className="flex items-center gap-2 truncate">
                <StatusDot status={selected} />
                {PROJECT_STATUS_LABEL[selected]}
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
