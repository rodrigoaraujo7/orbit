import { createFileRoute } from "@tanstack/react-router"

import { ComingSoon, PageHeader } from "@/components/layout/page"

export const Route = createFileRoute("/financeiro")({
  component: () => (
    <>
      <PageHeader
        title="Financeiro"
        description="Cobranças, pagamentos pendentes e custos de ferramentas."
      />
      <ComingSoon section="Financeiro" />
    </>
  ),
})
