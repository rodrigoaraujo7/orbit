import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

import { GeneralRegistry } from './general-registry'

afterEach(() => {
  cleanup()
})

describe('GeneralRegistry', () => {
  it('switches between contacts and custom tools', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GeneralRegistry />)
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Custom tools/ }))
    expect(await screen.findByText('CI')).toBeInTheDocument()
  })
})
