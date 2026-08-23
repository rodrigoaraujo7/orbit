import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Contact } from "@/data/contacts"
import type { CustomTool } from "@/data/custom-tools"
import { trpc } from "./trpc"

type RegistryContextValue = {
  contacts: Contact[]
  addContact: (contact: Contact) => void
  removeContact: (id: string) => void
  findContact: (id: string) => Contact | undefined
  customTools: CustomTool[]
  addCustomTool: (tool: CustomTool) => void
  removeCustomTool: (id: string) => void
}

const RegistryContext = createContext<RegistryContextValue | null>(null)

export function RegistryProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: () => trpc.contacts.list.query(),
  })
  const toolsQuery = useQuery({
    queryKey: ["custom-tools"],
    queryFn: () => trpc.tools.listCustom.query(),
  })

  const contacts = useMemo(() => (contactsQuery.data ?? []) as Contact[], [contactsQuery.data])
  const customTools = useMemo(
    () => (toolsQuery.data ?? []) as CustomTool[],
    [toolsQuery.data],
  )

  const addContactMut = useMutation({
    mutationFn: (contact: Contact) =>
      trpc.contacts.create.mutate({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  })
  const removeContactMut = useMutation({
    mutationFn: (id: string) => trpc.contacts.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  })
  const addToolMut = useMutation({
    mutationFn: (tool: CustomTool) =>
      trpc.tools.createCustom.mutate({ name: tool.name, category: tool.category }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-tools"] }),
  })
  const removeToolMut = useMutation({
    mutationFn: (id: string) => trpc.tools.deleteCustom.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-tools"] }),
  })

  const value = useMemo<RegistryContextValue>(
    () => ({
      contacts,
      addContact: (contact) => addContactMut.mutate(contact),
      removeContact: (id) => removeContactMut.mutate(id),
      findContact: (id) => contacts.find((c) => c.id === id),
      customTools,
      addCustomTool: (tool) => addToolMut.mutate(tool),
      removeCustomTool: (id) => removeToolMut.mutate(id),
    }),
    [contacts, customTools, addContactMut, removeContactMut, addToolMut, removeToolMut],
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
