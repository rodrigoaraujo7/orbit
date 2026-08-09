import { createFileRoute } from "@tanstack/react-router"

import { ComingSoon, PageHeader } from "@/components/layout/page"

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <>
      <PageHeader
        title="Dashboard"
        description="Metas, indicadores e números do seu negócio."
      />
      <ComingSoon section="Dashboard" />
    </>
  ),
})
