import { act, cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      onClick,
      className,
    }: {
      children?: ReactNode
      to?: string
      onClick?: () => void
      className?: string
    }) => (
      <a href={String(to)} className={className} onClick={onClick}>
        {children}
      </a>
    ),
  }
})

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(() => ({
      data: { user: { id: "u1", name: "Ada Lovelace", email: "ada@test.local" } },
      isPending: false,
    })),
    signOut: vi.fn(),
  },
}))

import { AppShell } from "./index"

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
})

describe("AppShell", () => {
  it("collapses and expands the desktop sidebar", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <AppShell>
        <p>Page</p>
      </AppShell>,
    )
    expect(screen.getByText("Page")).toBeInTheDocument()
    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0)
    const collapse = await screen.findByRole("button", { name: "Collapse menu" })
    await user.click(collapse)
    expect(localStorage.getItem("pm-sidebar-collapsed")).toBe("1")
    await user.click(screen.getByRole("button", { name: "Expand menu" }))
    expect(localStorage.getItem("pm-sidebar-collapsed")).toBe("0")
  })

  it("starts collapsed from localStorage and opens the mobile drawer", async () => {
    const user = userEvent.setup()
    localStorage.setItem("pm-sidebar-collapsed", "1")
    renderWithProviders(
      <AppShell>
        <p>Inside</p>
      </AppShell>,
    )
    expect(screen.getByRole("button", { name: "Expand menu" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Open menu" }))
    expect(await screen.findByText("Main navigation")).toBeInTheDocument()
    const dashboards = screen.getAllByRole("link", { name: /Dashboard/ })
    await user.click(dashboards[dashboards.length - 1]!)
  })

  it("reveals the collapse button after the intro delay", async () => {
    vi.useFakeTimers()
    renderWithProviders(
      <AppShell>
        <p>Page</p>
      </AppShell>,
    )
    const collapse = screen.getByRole("button", { name: "Collapse menu" })
    expect(collapse.className).toContain("opacity-0")
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(collapse.className).toContain("opacity-100")
  })

  it("clears the collapse-button timer when the sidebar unmounts", () => {
    vi.useFakeTimers()
    const { unmount } = renderWithProviders(
      <AppShell>
        <p>Page</p>
      </AppShell>,
    )
    unmount()
    vi.advanceTimersByTime(400)
  })
})
