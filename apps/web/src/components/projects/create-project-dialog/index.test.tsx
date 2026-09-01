import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleProject } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

const addProject = vi.fn().mockResolvedValue({ id: 'p1' })
const updateProject = vi.fn().mockResolvedValue({ ok: true })
const addContact = vi.fn().mockResolvedValue({ id: 'c1', name: 'Ada' })
const toastAdd = vi.fn()
const registry = vi.hoisted(() => ({
  contacts: [
    { id: 'c1', name: 'Ada Lovelace', email: 'ada@test.local', phone: '11', company: 'Acme' },
  ],
  isContactsPending: false,
}))

vi.mock('@/components/ui/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/toast')>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

vi.mock('@/lib/projects-store', () => ({
  useProjects: () => ({
    projects: [],
    isPending: false,
    isError: false,
    addProject,
    updateProject,
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject: vi.fn(),
    findProject: vi.fn(),
  }),
  ProjectsProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/lib/registry-store', () => ({
  useRegistry: () => ({
    contacts: registry.contacts,
    isPending: false,
    isContactsPending: registry.isContactsPending,
    isError: false,
    addContact,
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    findContact: (id: string) => registry.contacts.find((contact) => contact.id === id),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { CreateProjectDialog } from './index'

afterEach(() => {
  cleanup()
  addProject.mockClear()
  updateProject.mockClear()
  addContact.mockClear()
  toastAdd.mockClear()
  registry.contacts = [
    { id: 'c1', name: 'Ada Lovelace', email: 'ada@test.local', phone: '11', company: 'Acme' },
  ]
  registry.isContactsPending = false
  addProject.mockResolvedValue({ id: 'p1' })
  updateProject.mockResolvedValue({ ok: true })
})

describe('CreateProjectDialog', () => {
  it('creates a project with an existing contact', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<CreateProjectDialog open onOpenChange={onOpenChange} />)
    expect(await screen.findByText('New project')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Broker Portal'), 'Portal')
    await user.click(screen.getByRole('combobox', { name: /Primary contact/i }))
    await user.click(await screen.findByRole('option', { name: /Ada Lovelace/ }))
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    await waitFor(() => expect(addProject).toHaveBeenCalled())
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('creates a new contact inline and surfaces create errors', async () => {
    const user = userEvent.setup()
    addProject.mockRejectedValueOnce(new Error('nope'))
    renderWithProviders(<CreateProjectDialog open onOpenChange={vi.fn()} />)
    await user.click(await screen.findByText('Create a new contact'))
    await user.type(screen.getByPlaceholderText('Marcelo Tavares'), 'Bo')
    await user.type(screen.getByPlaceholderText('(11) 98765-4321'), '11999998888')
    await user.type(screen.getByPlaceholderText('Acme Ltd'), 'Studio')
    await user.type(screen.getByPlaceholderText('Broker Portal'), 'Shop')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    await waitFor(() => expect(addContact).toHaveBeenCalled())
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
  })

  it('forces the new-contact form when the registry is empty', async () => {
    registry.contacts = []
    renderWithProviders(<CreateProjectDialog open onOpenChange={vi.fn()} />)
    expect(await screen.findByPlaceholderText('Marcelo Tavares')).toBeInTheDocument()
    expect(screen.queryByText('Create a new contact')).not.toBeInTheDocument()
  })

  it('edits a project, adds a tool and shows installments', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateProjectDialog open onOpenChange={vi.fn()} project={sampleProject} />)
    expect(await screen.findByText('Edit project')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(updateProject).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Select a tool')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Remove tool' })[1]!)
    expect(screen.queryByText('Select a tool')).not.toBeInTheDocument()
  })

  it('cancels and can show a subset of sections', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(
      <CreateProjectDialog
        open
        onOpenChange={onOpenChange}
        sections={['identity']}
        title="Custom"
        description="Only name"
      />,
    )
    expect(await screen.findByText('Custom')).toBeInTheDocument()
    expect(screen.queryByText('Tools in use')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('toggles the new-contact form, billing installments and closed reset', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { rerender } = renderWithProviders(
      <CreateProjectDialog open onOpenChange={onOpenChange} />,
    )
    await user.click(await screen.findByText('Create a new contact'))
    expect(screen.getByPlaceholderText('Marcelo Tavares')).toBeInTheDocument()
    await user.click(screen.getByText('Create a new contact'))
    expect(screen.queryByPlaceholderText('Marcelo Tavares')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Broker Portal'), 'Portal')
    await user.click(screen.getByRole('combobox', { name: /Primary contact/i }))
    await user.click(await screen.findByRole('option', { name: /Ada Lovelace/ }))
    const amount = screen.getByPlaceholderText('0')
    await user.click(amount)
    await user.clear(amount)
    await user.type(amount, '18000')
    amount.blur()
    fireEvent.focus(amount)
    await user.click(amount)
    const billing = screen
      .getAllByRole('combobox')
      .find((el) => el.textContent?.includes('Upfront'))
    await user.click(billing!)
    await user.click(await screen.findByRole('option', { name: 'Installments' }))
    expect(screen.getAllByText('Installments').length).toBeGreaterThan(0)

    rerender(<CreateProjectDialog open={false} onOpenChange={onOpenChange} />)
  })

  it('resets forced new-contact once contacts appear and reports update errors', async () => {
    registry.contacts = []
    const { rerender } = renderWithProviders(<CreateProjectDialog open onOpenChange={vi.fn()} />)
    expect(await screen.findByPlaceholderText('Marcelo Tavares')).toBeInTheDocument()
    registry.contacts = [
      { id: 'c1', name: 'Ada Lovelace', email: 'ada@test.local', phone: '11', company: 'Acme' },
    ]
    rerender(<CreateProjectDialog open onOpenChange={vi.fn()} />)

    cleanup()
    updateProject.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    renderWithProviders(<CreateProjectDialog open onOpenChange={vi.fn()} project={sampleProject} />)
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })),
    )
  })
})
