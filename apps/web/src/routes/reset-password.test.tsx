import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { renderWithProviders } from "@/test/render"

const resetPassword = vi.fn()

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
    resetPassword: (...args: unknown[]) => resetPassword(...args),
  },
}))

import { Route } from "./reset-password"

const ResetPasswordPage = Route.options.component!
const search = { token: "reset-token" }

vi.spyOn(Route, "useSearch").mockImplementation(() => search as never)

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage("en-US")
})

beforeEach(() => {
  resetPassword.mockReset()
  search.token = "reset-token"
})

describe("reset password route", () => {
  it("keeps only a string token from the query string", () => {
    expect(Route.options.validateSearch?.({ token: "abc" })).toEqual({ token: "abc" })
    expect(Route.options.validateSearch?.({})).toEqual({ token: "" })
  })

  it("asks for a new link when the token is missing", () => {
    search.token = ""
    renderWithProviders(<ResetPasswordPage />)
    expect(screen.getByText("This link is invalid or has expired.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    )
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument()
  })

  it("rejects a short password and a mismatched confirmation", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText("New password"), "short")
    await user.type(screen.getByLabelText("Confirm the password"), "shorter")
    await user.click(screen.getByRole("button", { name: "Save the password" }))
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument()
    expect(screen.getByText("The passwords do not match")).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it("saves the new password", async () => {
    const user = userEvent.setup()
    resetPassword.mockResolvedValue({ error: null, data: { status: true } })
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText("New password"), "password1")
    await user.type(screen.getByLabelText("Confirm the password"), "password1")
    await user.click(screen.getByRole("button", { name: "Save the password" }))
    expect(await screen.findByText("Password updated. Sign in with it.")).toBeInTheDocument()
    expect(resetPassword).toHaveBeenCalledWith({
      newPassword: "password1",
      token: "reset-token",
    })
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login")
  })

  it("reports an expired token", async () => {
    const user = userEvent.setup()
    resetPassword.mockResolvedValue({ error: { code: "INVALID_TOKEN" }, data: null })
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText("New password"), "password1")
    await user.type(screen.getByLabelText("Confirm the password"), "password1")
    await user.click(screen.getByRole("button", { name: "Save the password" }))
    expect(await screen.findByText("This link is invalid or has expired.")).toBeInTheDocument()
  })
})
