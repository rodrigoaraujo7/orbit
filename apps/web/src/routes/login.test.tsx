import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { renderWithProviders } from '@/test/render'

const navigate = vi.fn()
const signInEmail = vi.fn()
const signUpEmail = vi.fn()
const verifyTotp = vi.fn()

vi.mock('@/components/Grainient', () => ({
  default: () => <div data-testid="grainient" />,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: { email: (...args: unknown[]) => signInEmail(...args) },
    signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
    signOut: vi.fn(),
    twoFactor: { verifyTotp: (...args: unknown[]) => verifyTotp(...args) },
  },
}))

import { Route } from './login'

const LoginPage = Route.options.component!

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en-US')
})

beforeEach(() => {
  navigate.mockReset()
  signInEmail.mockReset()
  signUpEmail.mockReset()
  verifyTotp.mockReset()
})

describe('login route', () => {
  it('signs in and navigates home', async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: {} })
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'ada@test.local')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
  })

  it('shows sign-in errors', async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: { code: 'INVALID_EMAIL_OR_PASSWORD' }, data: null })
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'ada@test.local')
    await user.type(screen.getByLabelText('Password'), 'bad')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })

  it('prompts for 2FA and verifies the code', async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    verifyTotp.mockResolvedValue({ error: null, data: {} })
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'ada@test.local')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Verification code')).toBeInTheDocument()
    await user.type(screen.getByLabelText('TOTP code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
  })

  it('shows an invalid 2FA code', async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    verifyTotp.mockResolvedValue({ error: { code: 'INVALID_CODE' }, data: null })
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'ada@test.local')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await user.type(await screen.findByLabelText('TOTP code'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByText('Invalid code')).toBeInTheDocument()
  })

  it('switches to sign up and creates an account', async () => {
    const user = userEvent.setup()
    signUpEmail.mockResolvedValue({ error: null, data: {} })
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.type(screen.getByLabelText('Email'), 'ada@test.local')
    await user.type(screen.getByLabelText('Password'), 'password1')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await waitFor(() => expect(signUpEmail).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('shows sign-up errors and can switch back', async () => {
    const user = userEvent.setup()
    signUpEmail.mockResolvedValue({ error: { code: 'USER_ALREADY_EXISTS' }, data: null })
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.type(screen.getByLabelText('Email'), 'ada@test.local')
    await user.type(screen.getByLabelText('Password'), 'password1')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText('This email is already in use')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('toggles the locale', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Language' }))
    expect(i18n.language).toBe('pt-BR')
    await user.click(screen.getByRole('button', { name: 'Idioma' }))
    expect(i18n.language).toBe('en-US')
  })
})
