import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ConfirmDialog } from "./confirm-dialog"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

function Harness({
  onConfirm = vi.fn(),
  confirmLabel,
  confirmWord,
}: {
  onConfirm?: () => void
  confirmLabel?: string
  confirmWord?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete item"
      description="This cannot be undone."
      confirmLabel={confirmLabel}
      confirmWord={confirmWord}
      onConfirm={onConfirm}
    />
  )
}

describe("ConfirmDialog", () => {
  it("keeps confirm disabled until the word matches", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithProviders(<Harness onConfirm={onConfirm} />)
    const dialog = await screen.findByRole("dialog")
    const confirm = within(dialog).getByRole("button", { name: "Confirm" })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByRole("textbox"), "nope")
    expect(confirm).toBeDisabled()
    await user.clear(within(dialog).getByRole("textbox"))
    await user.type(within(dialog).getByRole("textbox"), "DELETE")
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalled()
  })

  it("cancels and clears the field when reopened", async () => {
    const user = userEvent.setup()
    function Toggle() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen
          </button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Delete item"
            description="Gone."
            onConfirm={() => undefined}
          />
        </>
      )
    }
    renderWithProviders(<Toggle />)
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByRole("textbox"), "abc")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await user.click(screen.getByRole("button", { name: "Reopen" }))
    expect(within(await screen.findByRole("dialog")).getByRole("textbox")).toHaveValue("")
  })
})
