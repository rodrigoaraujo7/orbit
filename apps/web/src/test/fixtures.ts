import { vi } from 'vitest'
import type { Contact } from '@/data/contacts'
import type { CustomTool } from '@/data/custom-tools'
import type { Invoice, Project, Tool } from '@/data/projects'
import type { ReactNode } from 'react'

export const sampleContact: Contact = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@test.local',
  phone: '(11) 98888-0000',
  company: 'Analytical Engines',
}

export const sampleTool: Tool = {
  id: 'vercel',
  name: 'Vercel',
  category: 'deploy',
  account: 'ada@test.local',
  billing: {
    amount: 20,
    cycle: 'monthly',
    nextInvoice: '2026-09-01',
    payer: 'me',
    currency: 'BRL',
  },
  secrets: [{ key: 'API_KEY', value: 'secret-value' }],
}

export const sampleProject: Project = {
  id: 'p1',
  name: 'Portal',
  clientId: 'c1',
  status: 'in-development',
  startedAt: '2026-01-15',
  endedAt: '2026-08-01',
  description: 'Client portal',
  deal: { kind: 'installment', amount: 3000, installments: 3, currency: 'BRL' },
  tools: [sampleTool],
  repo: {
    fullName: 'ada/portal',
    url: 'https://github.com/ada/portal',
    workflow: 'success',
  },
  comments: [
    {
      id: 'cm1',
      author: 'Ada Lovelace',
      createdAt: '2026-02-01T10:00',
      body: 'Looks good',
    },
  ],
}

export const sampleInvoice: Invoice = {
  id: 'inv-1',
  referenceMonth: '2026-02',
  amount: 1000,
  status: 'paid',
  paymentMethod: 'pix',
  generatedAt: '2026-02-01',
  paidAt: '2026-02-10T12:00',
  payerName: 'Ada',
  hasAttachment: true,
  currency: 'BRL',
}

export const sampleCustomTool: CustomTool = {
  id: 't1',
  name: 'CI',
  category: 'deploy',
}

export function createProjectsStoreMock(overrides: Record<string, unknown> = {}) {
  const store = {
    projects: [] as Project[],
    isPending: false,
    isError: false,
    addProject: vi.fn().mockResolvedValue({ id: 'p1' }),
    updateProject: vi.fn().mockResolvedValue({ ok: true as const }),
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject: vi.fn().mockResolvedValue({ ok: true as const }),
    findProject: vi.fn((id: string) => store.projects.find((project) => project.id === id)),
    ...overrides,
  }
  return store
}

export function createRegistryStoreMock(overrides: Record<string, unknown> = {}) {
  const store = {
    contacts: [] as Contact[],
    isPending: false,
    isContactsPending: false,
    isError: false,
    addContact: vi.fn().mockResolvedValue({ ...sampleContact }),
    updateContact: vi.fn().mockResolvedValue({ ok: true as const }),
    removeContact: vi.fn().mockResolvedValue({ ok: true as const }),
    findContact: vi.fn((id: string) => store.contacts.find((contact) => contact.id === id)),
    customTools: [] as CustomTool[],
    addCustomTool: vi.fn().mockResolvedValue({ ...sampleCustomTool }),
    updateCustomTool: vi.fn().mockResolvedValue({ ok: true as const }),
    removeCustomTool: vi.fn().mockResolvedValue({ ok: true as const }),
    ...overrides,
  }
  return store
}

export function PassThrough({ children }: { children: ReactNode }) {
  return children
}
