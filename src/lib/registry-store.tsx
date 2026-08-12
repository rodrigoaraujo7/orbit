import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { Contact } from "@/data/contacts"
import type { CustomTool } from "@/data/custom-tools"

type RegistryContextValue = {
  contacts: Contact[]
  addContact: (contact: Contact) => void
  removeContact: (id: string) => void
  customTools: CustomTool[]
  addCustomTool: (tool: CustomTool) => void
  removeCustomTool: (id: string) => void
}

const RegistryContext = createContext<RegistryContextValue | null>(null)

/**
 * ponytail: in-memory state, gone on reload — same limitation as
 * ProjectsProvider (projects-store.tsx). No API yet — once there is one,
 * swap for fetch/mutation keeping this same interface.
 */
export function RegistryProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [customTools, setCustomTools] = useState<CustomTool[]>([])

  const value = useMemo<RegistryContextValue>(
    () => ({
      contacts,
      addContact: (contact) =>
        setContacts((current) => [contact, ...current]),
      removeContact: (id) =>
        setContacts((current) => current.filter((c) => c.id !== id)),
      customTools,
      addCustomTool: (tool) =>
        setCustomTools((current) => [tool, ...current]),
      removeCustomTool: (id) =>
        setCustomTools((current) => current.filter((t) => t.id !== id)),
    }),
    [contacts, customTools]
  )

  return <RegistryContext value={value}>{children}</RegistryContext>
}

export function useRegistry() {
  const context = useContext(RegistryContext)
  if (!context) {
    throw new Error("useRegistry must be used inside <RegistryProvider>")
  }
  return context
}
