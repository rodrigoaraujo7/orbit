import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'

const removeContact = vi.fn().mockResolvedValue({ ok: true })
const toastAdd = vi.fn()
const projects = vi.hoisted(() => ({
  list: [
    {
      id: 'p1',
      name: 'Portal',
      clientId: 'c1',
      status: 'in-development' as const,
      startedAt: '2026-01-15',
      deal: { kind: 'upfront' as const, amount: 0 },
      tools: [],
      repo: null,
    },
  ],
}))
const contacts = vi.hoisted(() => ({
  list: [
    { id: 'c1', name: 'Ada Lovelace', email: 'ada@test.local' },
    { id: 'c2', name: 'Boole' },
  ],
}))

vi.mock('@/components/ui/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/toast')>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

vi.mock('@/lib/projects-store', () => ({
  useProjects: () => ({
    projects: projects.list,
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
    contacts: contacts.list,
    isPending: false,
    isContactsPending: false,
    isError: false,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact,
    findContact: vi.fn(),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { ContactsPanel } from './contacts-panel'

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
  removeContact.mockClear()
  removeContact.mockResolvedValue({ ok: true })
  projects.list = [
    {
      id: 'p1',
      name: 'Portal',
      clientId: 'c1',
      status: 'in-development',
      startedAt: '2026-01-15',
      deal: { kind: 'upfront', amount: 0 },
      tools: [],
      repo: null,
    },
  ]
  contacts.list = [
    { id: 'c1', name: 'Ada Lovelace', email: 'ada@test.local' },
    { id: 'c2', name: 'Boole' },
  ]
})

async function confirm(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByRole('textbox'), 'delete')
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
}

describe('ContactsPanel', () => {
  it('opens create and edit dialogs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactsPanel />)
    await user.click(screen.getByRole('button', { name: /New contact/ }))
    expect(
      await screen.findByText('Register a contact to reuse across projects.'),
    ).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getAllByRole('button', { name: 'More actions' })[0]!)
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(await screen.findByText('Edit contact')).toBeInTheDocument()
  })

  it('blocks deleting a contact that is in use', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactsPanel />)
    await user.click(screen.getAllByRole('button', { name: 'More actions' })[0]!)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await confirm(user)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
    expect(removeContact).not.toHaveBeenCalled()
  })

  it('deletes an unused contact and reports failures', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactsPanel />)
    await user.click(screen.getAllByRole('button', { name: 'More actions' })[1]!)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await confirm(user)
    expect(removeContact).toHaveBeenCalledWith('c2')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))

    removeContact.mockImplementationOnce(() => {
      throw new Error('nope')
    })
    await user.click(screen.getAllByRole('button', { name: 'More actions' })[1]!)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await confirm(user)
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not delete contact' }),
    )
  })

  it('shows the empty table', () => {
    contacts.list = []
    renderWithProviders(<ContactsPanel />)
    expect(screen.getByText('No contacts registered.')).toBeInTheDocument()
  })

  it('sorts by name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactsPanel />)
    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!)
  })
})
