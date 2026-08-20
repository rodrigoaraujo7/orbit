import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ProjectIssueDialog } from "@/components/kanban/project-issue-dialog"
import { PageHeader } from "@/components/layout/page"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"

function KanbanPage() {
  const { findProject } = useProjects()
  const { findContact } = useRegistry()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const project = selectedId ? findProject(selectedId) : undefined

  return (
    <>
      <PageHeader
        title="Kanban"
        description="O que está em desenvolvimento e o que está na fila."
      />
      <KanbanBoard
        clientName={(clientId) => findContact(clientId)?.name ?? "—"}
        onOpen={(id) => {
          setSelectedId(id)
          setOpen(true)
        }}
      />
      <ProjectIssueDialog
        project={project}
        contact={project ? findContact(project.clientId) : undefined}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

export const Route = createFileRoute("/kanban")({
  component: KanbanPage,
})
