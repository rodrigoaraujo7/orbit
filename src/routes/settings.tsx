import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "@/components/layout/page"
import { GeneralRegistry } from "@/components/settings/general-registry"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Cadastros gerais e preferências da conta."
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="general-registry">
          <TabsList>
            <TabsTab value="general-registry">Cadastros gerais</TabsTab>
          </TabsList>

          <TabsPanel value="general-registry" className="mt-4">
            <GeneralRegistry />
          </TabsPanel>
        </Tabs>
      </div>
    </>
  )
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})
