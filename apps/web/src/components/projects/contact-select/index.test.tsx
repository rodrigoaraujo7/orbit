import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleContact } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

const contacts = [sampleContact, { id: 'c2', name: 'Boole', email: 'bo@test.local' }]

vi.mock('@/lib/registry-store', () => ({
  useRegistry: () => ({
    contacts,
    isPending: false,
    isContactsPending: false,
    isError: false,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    findContact: (id: string) => contacts.find((contact) => contact.id === id),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { ContactSelect } from './index'

afterEach(() => {
  cleanup()
})

describe('ContactSelect', () => {
  it('shows a placeholder then a selected contact', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { rerender } = renderWithProviders(
      <ContactSelect value="" onValueChange={onValueChange} />,
    )
    expect(screen.getByText('Select a contact')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox'))
    expect(
      await screen.findByText('ada@test.local · (11) 98888-0000 · Analytical Engines'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /Ada Lovelace/ }))
    expect(onValueChange).toHaveBeenCalledWith('c1')
    rerender(<ContactSelect value="c1" onValueChange={onValueChange} />)
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0)
  })
})
