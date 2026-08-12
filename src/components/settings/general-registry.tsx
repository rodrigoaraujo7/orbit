import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { ContactsPanel } from "./contacts-panel"
import { CustomToolsPanel } from "./custom-tools-panel"

export function GeneralRegistry() {
  return (
    <Tabs defaultValue="contacts">
      <TabsList>
        <TabsTab value="contacts">Contatos</TabsTab>
        <TabsTab value="custom-tools">Ferramentas customizadas</TabsTab>
      </TabsList>

      <TabsPanel value="contacts" className="mt-4">
        <ContactsPanel />
      </TabsPanel>
      <TabsPanel value="custom-tools" className="mt-4">
        <CustomToolsPanel />
      </TabsPanel>
    </Tabs>
  )
}
