import { Circle, CircleCheck, CircleX, LoaderCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  PROJECT_STATUS_LABEL,
  WORKFLOW_STATUS_LABEL,
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
