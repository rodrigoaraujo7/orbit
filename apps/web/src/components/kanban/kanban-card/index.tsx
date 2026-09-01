import { useSortable } from "@dnd-kit/react/sortable"
import { User } from "lucide-react"
import { useEffect, useRef, type ComponentProps, type KeyboardEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import type { Project, ProjectStatus } from "@/data/projects"
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
  return (
    <Card
      size="sm"
      className={cn(
        "shrink-0 shadow-none ring-border",
        overlay
          ? "rotate-1 cursor-grabbing shadow-lg ring-foreground/10"
          : "cursor-pointer hover:bg-muted/40",
        className,
      )}
      {...props}
    >
      <CardHeader>
        <CardTitle className="truncate font-heading text-lg font-normal">{project.name}</CardTitle>
        <Badge variant="muted">
          <User />
          {clientName}
        </Badge>
      </CardHeader>
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
