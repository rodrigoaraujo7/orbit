import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FilterDrawer } from "./filter-drawer"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

describe("FilterDrawer", () => {
  it("opens filters and clears when active", async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    renderWithProviders(
      <FilterDrawer hasActive onClear={onClear}>
        <p>Client filter</p>
      </FilterDrawer>,
    )

    await user.click(screen.getByRole("button", { name: "Filter" }))
    expect(await screen.findByText("Filters")).toBeInTheDocument()
    expect(screen.getByText("Client filter")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(onClear).toHaveBeenCalled()
  })

  it("disables clear when nothing is active", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <FilterDrawer hasActive={false} onClear={() => undefined}>
        <p>Empty</p>
      </FilterDrawer>,
    )
    await user.click(screen.getByRole("button", { name: "Filter" }))
    expect(await screen.findByRole("button", { name: "Clear" })).toBeDisabled()
  })
})
