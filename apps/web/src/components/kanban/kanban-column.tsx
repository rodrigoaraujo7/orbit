import { useDroppable } from "@dnd-kit/react"
import { useTranslation } from "react-i18next"

import { StatusDot } from "@/components/projects/status-badges"
import { type Project, type ProjectStatus } from "@/data/projects"
import { statusLabel } from "@/i18n/labels"
import { cn } from "@/lib/utils"
import { KanbanCard } from "./kanban-card"

export function KanbanColumn({
  status,
  projects,
  clientName,
  reducedMotion,
  onOpen,
}: {
  status: ProjectStatus
  projects: Project[]
  clientName: (clientId: string) => string
  reducedMotion: boolean
  onOpen: (id: string) => void
}) {
  useTranslation()
  const { ref, isDropTarget } = useDroppable({
    id: status,
    accept: "project",
    // Cards must win when the pointer is over them; the column is the
    // fallback so empty lists (and the gap after the last card) still work.
    collisionPriority: 0,
  })

  return (
    <section
      ref={ref}
      className={cn(
        "flex h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-transparent",
        isDropTarget && "bg-muted ring-ring",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 px-3 py-3">
        <StatusDot status={status} />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
          {statusLabel(status)}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{projects.length}</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhum projeto</p>
        ) : (
          projects.map((project, index) => (
            <KanbanCard
              key={project.id}
              project={project}
              clientName={clientName(project.clientId)}
              index={index}
              status={status}
              reducedMotion={reducedMotion}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  )
}
