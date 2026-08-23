import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "@/components/layout/page"
import { GeneralRegistry } from "@/components/settings/general-registry"
import { TwoFactorCard } from "@/components/settings/two-factor-card"

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Cadastros gerais e preferências da conta."
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <TwoFactorCard />
        <GeneralRegistry />
      </div>
    </>
  )
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})
