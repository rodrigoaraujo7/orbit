import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/render"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to?: string }) => (
    <a href={String(to)}>{children}</a>
  ),
}))

const session = vi.hoisted(() => ({
  data: { user: { id: "u1" } } as { user: { id: string } } | null,
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: session.data, isPending: false }),
  },
}))

import { ErrorPage, NotFoundPage, RouteErrorPage } from "./index"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  session.data = { user: { id: "u1" } }
})

describe("ErrorPage", () => {
  it("falls back to the warning icon and renders without actions", () => {
    renderWithProviders(<ErrorPage code="418" title="Teapot" description="No coffee here." />)
    expect(screen.getByText("418")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Teapot" })).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("NotFoundPage", () => {
  it("shows the 404 copy and a way back to the dashboard", () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument()
    expect(
      screen.getByText("This address does not exist, or what used to be here has moved."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute("href", "/")
  })

  it("points signed-out visitors at sign in instead of the dashboard", () => {
    session.data = null
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login")
    expect(screen.queryByRole("link", { name: "Back to the dashboard" })).not.toBeInTheDocument()
  })
})

describe("RouteErrorPage", () => {
  it("shows the generic error copy without technical details", () => {
    renderWithProviders(<RouteErrorPage error={new Error("boom")} reset={vi.fn()} />)
    expect(screen.getByText("500")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Something broke on this page" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Technical details")).not.toBeInTheDocument()
    expect(screen.queryByText("boom")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("places the retry action after the dashboard link", () => {
    renderWithProviders(<RouteErrorPage error={new Error("boom")} reset={vi.fn()} />)
    const dashboard = screen.getByRole("link", { name: "Back to the dashboard" })
    const retry = screen.getByRole("button", { name: "Try again" })
    expect(dashboard.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("retries through the router reset when one is given", async () => {
    const reset = vi.fn()
    renderWithProviders(<RouteErrorPage error={new Error("boom")} reset={reset} />)
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("reloads the page when there is no reset", async () => {
    const reload = vi.fn()
    vi.stubGlobal("location", { ...window.location, reload })
    renderWithProviders(<RouteErrorPage />)
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
