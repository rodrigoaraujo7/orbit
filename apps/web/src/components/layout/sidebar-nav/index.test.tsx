import { cleanup, screen } from "@testing-library/react"
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

import { SidebarNav } from "./index"

afterEach(() => {
  cleanup()
})

describe("SidebarNav", () => {
  it("renders links and reports navigation", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderWithProviders(<SidebarNav onNavigate={onNavigate} />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Kanban")).toBeInTheDocument()
    await user.click(screen.getByText("Projects"))
    expect(onNavigate).toHaveBeenCalled()
  })

  it("hides labels when collapsed", () => {
    renderWithProviders(<SidebarNav collapsed />)
    expect(screen.getByText("Dashboard")).toHaveClass("sr-only")
  })
})
