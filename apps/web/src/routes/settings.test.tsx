import { cleanup, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleContact, sampleCustomTool, sampleProject } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

vi.mock('@/lib/projects-store', () => ({
  useProjects: () => ({
    projects: [sampleProject],
    isPending: false,
    isError: false,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject: vi.fn(),
    findProject: vi.fn(),
  }),
  ProjectsProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/lib/registry-store', () => ({
  useRegistry: () => ({
    contacts: [sampleContact],
    isPending: false,
    isContactsPending: false,
    isError: false,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    findContact: vi.fn(),
    customTools: [sampleCustomTool],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { Route } from './settings'

const SettingsPage = Route.options.component!

afterEach(() => {
  cleanup()
})

describe('settings route', () => {
  it('renders the registry', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })
})
