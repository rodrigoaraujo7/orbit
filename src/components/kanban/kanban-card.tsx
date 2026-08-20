import { useSortable } from "@dnd-kit/react/sortable"
import { useEffect, useRef, type ComponentProps, type KeyboardEvent } from "react"

import { WorkflowBadge } from "@/components/projects/status-badges"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FREE_LABEL, isDealFree, type Project, type ProjectStatus } from "@/data/projects"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

function KanbanCardFace({
  project,
  clientName,
  className,
  overlay,
  ...props
}: {
  project: Project
  clientName: string
  overlay?: boolean
  className?: string
} & ComponentProps<typeof Card>) {
  const dealLabel = isDealFree(project.deal)
    ? FREE_LABEL
    : formatCurrency(project.deal.amount, project.deal.currency)

  return (
    <Card
      size="sm"
      className={cn(
        "shrink-0 shadow-none ring-border",
        overlay ? "rotate-1 cursor-grabbing shadow-lg ring-foreground/10" : "cursor-pointer hover:bg-muted/40",
        className,
      )}
      {...props}
    >
      <CardHeader>
        <CardTitle className="truncate">{project.name}</CardTitle>
        <CardDescription className="truncate">{clientName}</CardDescription>
        {project.repo && (
          <CardAction>
            <WorkflowBadge status={project.repo.workflow} iconOnly />
          </CardAction>
        )}
      </CardHeader>
      <p className="px-(--card-spacing) text-xs text-muted-foreground">{dealLabel}</p>
    </Card>
  )
}

export function KanbanCard({
  project,
  clientName,
  index = 0,
  status,
  overlay = false,
  reducedMotion = false,
  onOpen,
}: {
  project: Project
  clientName: string
  index?: number
  status?: ProjectStatus
  overlay?: boolean
  reducedMotion?: boolean
  onOpen?: (id: string) => void
}) {
  if (overlay) {
    return <KanbanCardFace project={project} clientName={clientName} overlay />
  }

  return (
    <SortableKanbanCard
      project={project}
      clientName={clientName}
      index={index}
      status={status ?? project.status}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
    />
  )
}

function SortableKanbanCard({
  project,
  clientName,
  index,
  status,
  reducedMotion,
  onOpen,
}: {
  project: Project
  clientName: string
  index: number
  status: ProjectStatus
  reducedMotion: boolean
  onOpen?: (id: string) => void
}) {
  const { ref, isDragging } = useSortable({
    id: project.id,
    index,
    type: "project",
    accept: "project",
    group: status,
    collisionPriority: 3,
    transition: reducedMotion ? null : undefined,
  })
  const skipClick = useRef(false)

  useEffect(() => {
    if (isDragging) skipClick.current = true
  }, [isDragging])

  function open() {
    onOpen?.(project.id)
  }

  function handleClick() {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    open()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      open()
    }
  }

  return (
    <KanbanCardFace
      ref={ref}
      project={project}
      clientName={clientName}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={isDragging ? "opacity-40" : undefined}
    />
  )
}
