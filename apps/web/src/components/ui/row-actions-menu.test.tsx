import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RowActionsMenu } from "./row-actions-menu"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

describe("RowActionsMenu", () => {
  it("opens and fires edit and delete", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderWithProviders(<RowActionsMenu onEdit={onEdit} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: "More actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
    expect(onEdit).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "More actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalled()
  })
})
