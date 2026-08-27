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

type ContactInput = Omit<Contact, "id">
type CustomToolInput = Omit<CustomTool, "id">

type RegistryContextValue = {
  contacts: Contact[]
  isPending: boolean
  isContactsPending: boolean
  isError: boolean
  addContact: (contact: ContactInput) => Promise<Contact>
  updateContact: (id: string, contact: ContactInput) => Promise<{ ok: true }>
  removeContact: (id: string) => Promise<{ ok: true }>
  findContact: (id: string) => Contact | undefined
  customTools: CustomTool[]
  addCustomTool: (tool: CustomToolInput) => Promise<CustomTool>
  updateCustomTool: (id: string, tool: CustomToolInput) => Promise<{ ok: true }>
  removeCustomTool: (id: string) => Promise<{ ok: true }>
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

  function invalidateContacts() {
    void queryClient.invalidateQueries({ queryKey: ["contacts"] })
    void queryClient.invalidateQueries({ queryKey: ["audit"] })
  }
  function invalidateTools() {
    void queryClient.invalidateQueries({ queryKey: ["custom-tools"] })
    void queryClient.invalidateQueries({ queryKey: ["audit"] })
  }

  const addContactMut = useMutation({
    mutationFn: (contact: ContactInput) =>
      trpc.contacts.create.mutate({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
      }),
    onSuccess: invalidateContacts,
    onError: invalidateContacts,
  })
  const removeContactMut = useMutation({
    mutationFn: (id: string) => trpc.contacts.delete.mutate({ id }),
    onSuccess: invalidateContacts,
    onError: invalidateContacts,
  })
  const updateContactMut = useMutation({
    mutationFn: ({ id, contact }: { id: string; contact: ContactInput }) =>
      trpc.contacts.update.mutate({
        id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
      }),
    onSuccess: invalidateContacts,
    onError: invalidateContacts,
  })
  const addToolMut = useMutation({
    mutationFn: (tool: CustomToolInput) =>
      trpc.tools.createCustom.mutate({ name: tool.name, category: tool.category }),
    onSuccess: invalidateTools,
    onError: invalidateTools,
  })
  const updateToolMut = useMutation({
    mutationFn: ({ id, tool }: { id: string; tool: CustomToolInput }) =>
      trpc.tools.updateCustom.mutate({
        id,
        name: tool.name,
        category: tool.category,
      }),
    onSuccess: invalidateTools,
    onError: invalidateTools,
  })
  const removeToolMut = useMutation({
    mutationFn: (id: string) => trpc.tools.deleteCustom.mutate({ id }),
    onSuccess: invalidateTools,
    onError: invalidateTools,
  })

  const value = useMemo<RegistryContextValue>(
    () => ({
      contacts,
      isPending: contactsQuery.isPending || toolsQuery.isPending,
      isContactsPending: contactsQuery.isPending,
      isError: contactsQuery.isError || toolsQuery.isError,
      addContact: (contact) => addContactMut.mutateAsync(contact),
      updateContact: (id, contact) =>
        updateContactMut.mutateAsync({ id, contact }),
      removeContact: (id) => removeContactMut.mutateAsync(id),
      findContact: (id) => contacts.find((c) => c.id === id),
      customTools,
      addCustomTool: (tool) => addToolMut.mutateAsync(tool),
      updateCustomTool: (id, tool) =>
        updateToolMut.mutateAsync({ id, tool }),
      removeCustomTool: (id) => removeToolMut.mutateAsync(id),
    }),
    [contacts, customTools, contactsQuery.isPending, contactsQuery.isError, toolsQuery.isPending, toolsQuery.isError, addContactMut, updateContactMut, removeContactMut, addToolMut, updateToolMut, removeToolMut],
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
