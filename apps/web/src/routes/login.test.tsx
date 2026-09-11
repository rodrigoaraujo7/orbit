import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { renderWithProviders } from "@/test/render"

const navigate = vi.fn()
const signInEmail = vi.fn()
const signUpEmail = vi.fn()
const sendOtp = vi.fn()
const verifyOtp = vi.fn()
const sendVerificationEmail = vi.fn()

vi.mock("@/components/Grainient", () => ({
  default: () => <div data-testid="grainient" />,
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      className,
    }: {
      children?: ReactNode
      to?: string
      className?: string
    }) => (
      <a href={String(to)} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => navigate,
  }
})

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: { email: (...args: unknown[]) => signInEmail(...args) },
    signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
    signOut: vi.fn(),
    twoFactor: {
      sendOtp: (...args: unknown[]) => sendOtp(...args),
      verifyOtp: (...args: unknown[]) => verifyOtp(...args),
    },
    sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args),
  },
}))

import { Route } from "./login"

const LoginPage = Route.options.component!

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage("en-US")
})

beforeEach(() => {
  navigate.mockReset()
  signInEmail.mockReset()
  signUpEmail.mockReset()
  sendOtp.mockReset()
  verifyOtp.mockReset()
  sendVerificationEmail.mockReset()
})

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@test.local")
  await user.type(screen.getByLabelText("Password"), "secret123")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("login route", () => {
  it("signs in and navigates home", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: {} })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }))
  })

  it("shows sign-in errors", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: { code: "INVALID_EMAIL_OR_PASSWORD" }, data: null })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument()
  })

  it("links to the password recovery screen", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    )
  })

  it("sends an email code and verifies it", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    sendOtp.mockResolvedValue({ error: null, data: { status: true } })
    verifyOtp.mockResolvedValue({ error: null, data: {} })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    expect(await screen.findByText("Verification code")).toBeInTheDocument()
    expect(
      screen.getByText("We sent a 6-digit code to ada@test.local. It expires in 10 minutes."),
    ).toBeInTheDocument()
    expect(sendOtp).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Send a new code in 30s" })).toBeDisabled()
    await user.type(screen.getByLabelText("Email code"), "123456")
    await user.click(screen.getByRole("button", { name: "Verify" }))
    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith({ code: "123456" }))
    expect(navigate).toHaveBeenCalledWith({ to: "/" })
  })

  it("rejects a code that is not six digits", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    sendOtp.mockResolvedValue({ error: null, data: { status: true } })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    await user.type(await screen.findByLabelText("Email code"), "123")
    await user.click(screen.getByRole("button", { name: "Verify" }))
    expect(await screen.findByText("Enter the 6-digit code")).toBeInTheDocument()
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it("shows an invalid email code", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    sendOtp.mockResolvedValue({ error: null, data: { status: true } })
    verifyOtp.mockResolvedValue({ error: { code: "INVALID_CODE" }, data: null })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    await user.type(await screen.findByLabelText("Email code"), "000000")
    await user.click(screen.getByRole("button", { name: "Verify" }))
    expect(await screen.findByText("Invalid code")).toBeInTheDocument()
  })

  it("reports a failure to send the code and resends on request", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    sendOtp.mockResolvedValue({ error: { code: "INTERNAL_SERVER_ERROR" }, data: null })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    expect(await screen.findByText("Could not send a new code")).toBeInTheDocument()
    // A failed send leaves no cooldown, so the resend button is live right away.
    await user.click(screen.getByRole("button", { name: "Send a new code" }))
    expect(await screen.findByText("Could not send a new code")).toBeInTheDocument()
    expect(screen.queryByText("New code sent.")).not.toBeInTheDocument()
    sendOtp.mockResolvedValue({ error: null, data: { status: true } })
    await user.click(screen.getByRole("button", { name: "Send a new code" }))
    expect(await screen.findByText("New code sent.")).toBeInTheDocument()
    expect(sendOtp).toHaveBeenCalledTimes(3)
  })

  it("counts the resend cooldown down", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: null, data: { twoFactorRedirect: true } })
    sendOtp.mockResolvedValue({ error: null, data: { status: true } })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    expect(await screen.findByRole("button", { name: "Send a new code in 30s" })).toBeDisabled()
    expect(
      await screen.findByRole("button", { name: "Send a new code in 29s" }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it("asks for confirmation after sign up", async () => {
    const user = userEvent.setup()
    signUpEmail.mockResolvedValue({ error: null, data: { user: { id: "u1" } } })
    sendVerificationEmail.mockResolvedValue({ error: null, data: { status: true } })
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole("button", { name: "Create" }))
    await user.type(screen.getByLabelText("Name"), "Ada")
    await user.type(screen.getByLabelText("Email"), "ada@test.local")
    await user.type(screen.getByLabelText("Password"), "password1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Confirm your email")
    expect(dialog).toHaveTextContent("ada@test.local")
    expect(signUpEmail).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@test.local",
      password: "password1",
      locale: "en-US",
    })
    await user.click(screen.getByRole("button", { name: "Send the link again" }))
    expect(await screen.findByText("New link sent.")).toBeInTheDocument()
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: "ada@test.local",
      callbackURL: "/",
    })
    expect(screen.getByRole("button", { name: "Send a new code in 30s" })).toBeDisabled()
    expect(
      await screen.findByRole("button", { name: "Send a new code in 29s" }, { timeout: 3000 }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Back to sign in" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })

  it("sends an unconfirmed account to the confirmation dialog", async () => {
    const user = userEvent.setup()
    signInEmail.mockResolvedValue({ error: { code: "EMAIL_NOT_VERIFIED" }, data: null })
    sendVerificationEmail.mockResolvedValue({ error: { status: 429 }, data: null })
    renderWithProviders(<LoginPage />)
    await signIn(user)
    expect(await screen.findByRole("dialog")).toHaveTextContent("Confirm your email")
    expect(
      screen.getByText(
        "We sent a confirmation link to ada@test.local. Open it to activate your account, then sign in.",
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Send the link again" }))
    expect(await screen.findByText("Too many requests. Try again later.")).toBeInTheDocument()
  })

  it("shows sign-up errors and can switch back", async () => {
    const user = userEvent.setup()
    signUpEmail.mockResolvedValue({ error: { code: "USER_ALREADY_EXISTS" }, data: null })
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole("button", { name: "Create" }))
    await user.type(screen.getByLabelText("Name"), "Ada")
    await user.type(screen.getByLabelText("Email"), "ada@test.local")
    await user.type(screen.getByLabelText("Password"), "password1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(await screen.findByText("This email is already in use")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })

  it("toggles the locale", async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole("button", { name: "Language" }))
    expect(i18n.language).toBe("pt-BR")
    await user.click(screen.getByRole("button", { name: "Idioma" }))
    expect(i18n.language).toBe("en-US")
  })
})
