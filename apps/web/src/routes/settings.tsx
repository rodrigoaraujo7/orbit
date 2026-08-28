import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/layout/page"
import { GeneralRegistry } from "@/components/settings/general-registry"

function SettingsPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <GeneralRegistry />
      </div>
    </>
  )
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})
