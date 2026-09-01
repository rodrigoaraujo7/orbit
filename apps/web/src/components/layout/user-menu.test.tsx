import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { renderWithProviders } from '@/test/render'

const auth = vi.hoisted(() => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@test.local' } },
    isPending: false,
  })),
  signOut: vi.fn(),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: auth.useSession,
    signOut: auth.signOut,
  },
}))

import { UserMenu } from './user-menu'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en-US')
  auth.useSession.mockReturnValue({
    data: { user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@test.local' } },
    isPending: false,
  })
})

describe('UserMenu', () => {
  it('switches locale and signs out', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserMenu />)
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    await user.click(screen.getByText('Ada Lovelace'))
    expect(await screen.findByText('Edit profile')).toBeInTheDocument()
    expect(screen.getByText('Switch account')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: /Português/ }))
    expect(i18n.language).toBe('pt-BR')
    await user.click(screen.getByText('AL'))
    await user.click(await screen.findByRole('menuitem', { name: /English/ }))
    expect(i18n.language).toBe('en-US')
    await user.click(screen.getByText('AL'))
    await user.click(await screen.findByRole('menuitem', { name: /Sign out/ }))
    expect(auth.signOut).toHaveBeenCalled()
  })

  it('falls back when the session is missing and can collapse', async () => {
    auth.useSession.mockReturnValue({ data: null as never, isPending: false })
    const user = userEvent.setup()
    renderWithProviders(<UserMenu collapsed />)
    await user.click(screen.getByText('A'))
    expect(await screen.findByText('Edit profile')).toBeInTheDocument()
  })
})
