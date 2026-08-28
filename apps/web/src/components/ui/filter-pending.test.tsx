import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DashboardFilterSkeleton,
  FilterPending,
  KanbanFilterSkeleton,
  TableFilterSkeleton,
} from "./filter-pending"
import { renderWithProviders } from "@/test/render"

const reduced = vi.hoisted(() => ({ value: false }))

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => reduced.value,
}))

afterEach(() => {
  cleanup()
  reduced.value = false
})

describe("FilterPending", () => {
  it("shows the skeleton on first load", () => {
    renderWithProviders(
      <FilterPending isPending isFetching skeleton={<p>Skeleton</p>} className="wrap">
        <p>Results</p>
      </FilterPending>,
    )
    expect(screen.getByText("Skeleton")).toBeInTheDocument()
    expect(screen.queryByText("Results")).not.toBeInTheDocument()
  })

  it("mutes results and shows a scan while refetching", () => {
    const { container } = renderWithProviders(
      <FilterPending isPending={false} isFetching skeleton={<p>Skeleton</p>}>
        <p>Results</p>
      </FilterPending>,
    )
    expect(screen.getByText("Results").parentElement).toHaveAttribute("aria-busy", "true")
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy()
  })

  it("skips the scan when motion is reduced", () => {
    reduced.value = true
    const { container } = renderWithProviders(
      <FilterPending isPending={false} isFetching skeleton={<p>Skeleton</p>}>
        <p>Results</p>
      </FilterPending>,
    )
    expect(container.querySelector("[aria-hidden='true']")).toBeNull()
    expect(screen.getByText("Results")).toBeInTheDocument()
  })

  it("renders filter skeletons", () => {
    const { container, rerender } = renderWithProviders(<TableFilterSkeleton />)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(8)
    rerender(<TableFilterSkeleton rows={2} />)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
    renderWithProviders(<KanbanFilterSkeleton />)
    renderWithProviders(<DashboardFilterSkeleton />)
  })
})
