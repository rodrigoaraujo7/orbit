import { createTRPCClient, httpBatchLink } from "@trpc/client"

import type { Contact } from "@/data/contacts"
import type { CustomTool } from "@/data/custom-tools"
import type { Project, ProjectStatus } from "@/data/projects"

type BrowserRouter = {
  contacts: {
    list: { query: () => Promise<Contact[]> }
    create: {
      mutate: (input: {
        name: string
        email?: string
        phone?: string
        company?: string
      }) => Promise<Contact>
    }
    delete: { mutate: (input: { id: string }) => Promise<{ ok: true }> }
  }
  projects: {
    list: { query: () => Promise<Project[]> }
    create: { mutate: (input: Project) => Promise<{ id: string }> }
    update: { mutate: (input: Project) => Promise<{ ok: true }> }
    move: {
      mutate: (input: { id: string; status: ProjectStatus; index: number }) => Promise<{ ok: true }>
    }
    delete: { mutate: (input: { id: string }) => Promise<{ ok: true }> }
  }
  tools: {
    listCustom: { query: () => Promise<CustomTool[]> }
    createCustom: {
      mutate: (input: { name: string; category: string }) => Promise<CustomTool>
    }
    deleteCustom: { mutate: (input: { id: string }) => Promise<{ ok: true }> }
  }
}

export const trpc = createTRPCClient({
  links: [
    httpBatchLink({
      url: "/trpc",
      fetch(url, init) {
        return fetch(url, { ...init, credentials: "include" })
      },
    }),
  ],
}) as unknown as BrowserRouter
