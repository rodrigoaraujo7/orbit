import { Puzzle, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Tabs, TabsDock, TabsDockTab, TabsPanel } from "@/components/ui/tabs"
import { ContactsPanel } from "../contacts-panel"
import { CustomToolsPanel } from "../custom-tools-panel"

export function GeneralRegistry() {
  const { t } = useTranslation()
  return (
    <Tabs defaultValue="contacts" className="pb-24 md:pb-6">
      <TabsDock>
        <TabsDockTab value="contacts" icon={Users}>
          {t("settings.contacts")}
        </TabsDockTab>
        <TabsDockTab value="custom-tools" icon={Puzzle}>
          {t("settings.customTools")}
        </TabsDockTab>
      </TabsDock>

      <TabsPanel value="contacts" className="mt-4">
        <ContactsPanel />
      </TabsPanel>
      <TabsPanel value="custom-tools" className="mt-4">
        <CustomToolsPanel />
      </TabsPanel>
    </Tabs>
  )
}
