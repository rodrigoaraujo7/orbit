import { PointerActivationConstraints } from "@dnd-kit/dom"
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/react"
import { isSortable } from "@dnd-kit/react/sortable"
import { useEffect, useMemo, useRef, useState } from "react"

import { PROJECT_STATUS_ORDER, type Project, type ProjectStatus } from "@/data/projects"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useProjects } from "@/lib/projects-store"
import {
  columnsEqual,
  isProjectStatus,
  placeProjectInColumns,
  projectIdsByStatus,
  projectsFromColumns,
  type ProjectColumns,
} from "@/lib/project-status"
import { KanbanCard } from "./kanban-card"
import { KanbanColumn } from "./kanban-column"

const sensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
  }),
  KeyboardSensor,
]

type DropNode = {
  id: string | number
  index?: number
  group?: string | number
}

export function KanbanBoard({
  clientName,
  onOpen,
  filter,
}: {
  clientName: (clientId: string) => string
  onOpen: (id: string) => void
  filter?: (project: Project) => boolean
}) {
  const { projects, replaceProjects } = useProjects()
  const reducedMotion = useReducedMotion()
  const dragging = useRef(false)
  const snapshot = useRef<ProjectColumns | null>(null)
  const [columns, setColumns] = useState(() => projectIdsByStatus(projects))
  const columnsRef = useRef(columns)

  useEffect(() => {
    if (!dragging.current) {
      const next = projectIdsByStatus(projects)
      columnsRef.current = next
      setColumns(next)
    }
  }, [projects])

  const byId = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )

  function projectsIn(status: ProjectStatus): Project[] {
    return columns[status].flatMap((id) => {
      const project = byId.get(id)
      if (!project) return []
      if (filter && !filter(project)) return []
      return [project]
    })
  }

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={() => {
        dragging.current = true
        snapshot.current = columnsRef.current
      }}
      onDragOver={(event) => {
        // Keep React in charge of parent changes. The optimistic plugin
        // moves DOM nodes across columns and React 19 throws removeChild.
        event.preventDefault()
        const { source, target } = event.operation
        if (!isSortable(source) || !target) return

        setColumns((current) => {
          const drop = resolvePlacement(source, target, current)
          if (!drop) return current
          const next = placeProjectInColumns(
            current,
            String(source.id),
            drop.status,
            drop.beforeId
          )
          const resolved = columnsEqual(current, next) ? current : next
          columnsRef.current = resolved
          return resolved
        })
      }}
      onDragEnd={(event) => {
        dragging.current = false
        if (event.canceled) {
          if (snapshot.current) setColumns(snapshot.current)
          snapshot.current = null
          return
        }

        replaceProjects(projectsFromColumns(projects, columnsRef.current))
        snapshot.current = null
      }}
    >
      <div className="flex h-[calc(100svh-23rem)] min-h-0 gap-3 overflow-x-auto overflow-y-hidden px-4 py-6 md:h-[calc(100svh-19.5rem)] sm:px-6 lg:px-8">
        {PROJECT_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            projects={projectsIn(status)}
            clientName={clientName}
            reducedMotion={reducedMotion}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {(source) => {
          const project = byId.get(String(source.id))
          if (!project) return null
          return (
            <KanbanCard
              project={project}
              clientName={clientName(project.clientId)}
              overlay
            />
          )
        }}
      </DragOverlay>
    </DragDropProvider>
  )
}

function columnOfId(columns: ProjectColumns, id: string): ProjectStatus | null {
  for (const status of PROJECT_STATUS_ORDER) {
    if (columns[status].includes(id)) return status
  }
  return null
}

function resolvePlacement(
  source: DropNode,
  target: DropNode,
  columns: ProjectColumns
): { status: ProjectStatus; beforeId: string | null } | null {
  const targetId = String(target.id)
  if (isProjectStatus(targetId)) {
    return { status: targetId, beforeId: null }
  }

  const to = columnOfId(columns, targetId)
  if (!to) return null
  if (targetId === String(source.id)) return null

  return { status: to, beforeId: targetId }
}
