import { Puzzle, Users } from "lucide-react"

import { Tabs, TabsDock, TabsDockTab, TabsPanel } from "@/components/ui/tabs"
import { ContactsPanel } from "./contacts-panel"
import { CustomToolsPanel } from "./custom-tools-panel"

export function GeneralRegistry() {
  return (
    <Tabs defaultValue="contacts" className="pb-24 md:pb-6">
      <TabsDock>
        <TabsDockTab value="contacts" icon={Users}>
          Contatos
        </TabsDockTab>
        <TabsDockTab value="custom-tools" icon={Puzzle}>
          Ferramentas customizadas
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
