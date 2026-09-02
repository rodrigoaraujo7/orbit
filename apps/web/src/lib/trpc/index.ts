import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type {
  AuditChange,
  AuditModule,
  DashboardFilterInput,
  DashboardMetrics,
  Invoice,
  InvoiceListFilters,
  ProjectListFilters,
  WorkflowRun,
  WorkflowStatus,
} from "shared"

import type { Contact } from "@/data/contacts"
import type { CustomTool } from "@/data/custom-tools"
import type { Project, ProjectStatus } from "@/data/projects"

type AuditListInput = {
  search?: string
  modules?: AuditModule[]
  projectId?: string
  from?: string
  to?: string
  cursor?: { createdAt: string; id: string; module?: string } | null
  limit?: number
  sortBy?: "createdAt" | "module"
  sortDir?: "asc" | "desc"
}

type AuditListItem = {
  id: string
  module: string
  action: string
  subjectId: string | null
  subjectLabel: string | null
  projectId: string | null
  changes: AuditChange[]
  createdAt: string
  ip: string | null
  userAgent: string | null
}

type InvoiceListResult = {
  items: Invoice[]
  totals: { count: number; paid: number; overdue: number }
}

export type GithubStatus = {
  connected: boolean
  login: string | null
}

export type GithubRepo = {
  fullName: string
  defaultBranch: string
  isPrivate: boolean
  branches: string[]
}

export type GithubRuns = {
  branch: string
  defaultBranch: string
  isDefaultBranch: boolean
  workflow: WorkflowStatus
  runs: WorkflowRun[]
}

type BrowserRouter = {
  audit: {
    list: {
      query: (input: AuditListInput) => Promise<{
        items: AuditListItem[]
        nextCursor: { createdAt: string; id: string; module?: string } | null
      }>
    }
  }
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
    update: {
      mutate: (input: {
        id: string
        name: string
        email?: string
        phone?: string
        company?: string
      }) => Promise<{ ok: true }>
    }
    delete: { mutate: (input: { id: string }) => Promise<{ ok: true }> }
  }
  credentials: {
    reveal: {
      mutate: (input: { id: string }) => Promise<{ id: string; label: string; value: string }>
    }
    update: {
      mutate: (input: { id: string; label: string; value: string }) => Promise<{
        id: string
        label: string
      }>
    }
  }
  dashboard: {
    metrics: { query: (input?: DashboardFilterInput) => Promise<DashboardMetrics> }
  }
  github: {
    status: { query: () => Promise<GithubStatus> }
    connect: {
      mutate: (input: { token: string }) => Promise<{
        login: string | null
      }>
    }
    disconnect: { mutate: () => Promise<{ ok: true }> }
    repo: { query: (input: { projectId: string }) => Promise<GithubRepo> }
    runs: {
      query: (input: { projectId: string; branch?: string; limit?: number }) => Promise<GithubRuns>
    }
  }
  projects: {
    list: { query: (input?: ProjectListFilters) => Promise<Project[]> }
    create: { mutate: (input: Project) => Promise<{ id: string }> }
    update: { mutate: (input: Project) => Promise<{ ok: true }> }
    move: {
      mutate: (input: { id: string; status: ProjectStatus; index: number }) => Promise<{ ok: true }>
    }
    delete: { mutate: (input: { id: string }) => Promise<{ ok: true }> }
  }
  invoices: {
    list: { query: (input: InvoiceListFilters) => Promise<InvoiceListResult> }
  }
  tools: {
    listCustom: { query: () => Promise<CustomTool[]> }
    createCustom: {
      mutate: (input: { name: string; category: string }) => Promise<CustomTool>
    }
    updateCustom: {
      mutate: (input: { id: string; name: string; category: string }) => Promise<{ ok: true }>
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
