import { createFileRoute } from "@tanstack/react-router"

import { ComingSoon, PageHeader } from "@/components/layout/page"

export const Route = createFileRoute("/kanban")({
  component: () => (
    <>
      <PageHeader
        title="Kanban"
        description="O que está em desenvolvimento e o que está na fila."
      />
      <ComingSoon section="Kanban" />
    </>
  ),
})
