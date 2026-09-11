import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { renderWithProviders } from "@/test/render"

const requestPasswordReset = vi.fn()

vi.mock("@/components/Grainient", () => ({
  default: () => <div data-testid="grainient" />,
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to }: { children?: ReactNode; to?: string }) => (
      <a href={String(to)}>{children}</a>
    ),
  }
})

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
  },
}))

import { Route } from "./forgot-password"

const ForgotPasswordPage = Route.options.component!

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage("en-US")
})

beforeEach(() => {
  requestPasswordReset.mockReset()
})

describe("forgot password route", () => {
  it("validates the email before asking for a link", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.click(screen.getByRole("button", { name: "Send the link" }))
    expect(await screen.findByText("Enter the email")).toBeInTheDocument()
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it("requests the link and confirms without leaking whether the account exists", async () => {
    const user = userEvent.setup()
    requestPasswordReset.mockResolvedValue({ error: null, data: { status: true } })
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText("Email"), "ada@test.local")
    await user.click(screen.getByRole("button", { name: "Send the link" }))
    expect(
      await screen.findByText(
        "If that address has an account, the link is on its way. Check your inbox.",
      ),
    ).toBeInTheDocument()
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: "ada@test.local",
      redirectTo: `${window.location.origin}/reset-password`,
    })
    expect(screen.queryByRole("button", { name: "Send the link" })).not.toBeInTheDocument()
  })

  it("surfaces a failure to send the link", async () => {
    const user = userEvent.setup()
    requestPasswordReset.mockResolvedValue({ error: { status: 429 }, data: null })
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText("Email"), "ada@test.local")
    await user.click(screen.getByRole("button", { name: "Send the link" }))
    expect(await screen.findByText("Too many requests. Try again later.")).toBeInTheDocument()
  })

  it("links back to sign in", () => {
    renderWithProviders(<ForgotPasswordPage />)
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login")
  })
})
