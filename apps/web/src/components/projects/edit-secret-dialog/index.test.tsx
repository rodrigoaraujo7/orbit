import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

const toastAdd = vi.fn()

vi.mock("@/components/ui/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/toast")>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

vi.mock("@/lib/trpc", async () => {
  const { createTrpcMock } = await import("@/test/mocks")
  return { trpc: createTrpcMock() }
})

import { trpc } from "@/lib/trpc"
import { EditSecretDialog } from "./index"

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
  trpc.credentials.update.mutate.mockReset()
  trpc.credentials.update.mutate.mockResolvedValue({ id: "sec-1", label: "API_KEY" })
})

const secret = { id: "sec-1", key: "API_KEY" }

describe("EditSecretDialog", () => {
  it("saves a new value and reports errors", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<EditSecretDialog open onOpenChange={onOpenChange} secret={secret} />)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByDisplayValue("API_KEY")).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText("Secret value"), "sk_new")
    await user.click(within(dialog).getByRole("button", { name: "Reveal value" }))
    expect(within(dialog).getByLabelText("Secret value")).toHaveAttribute("type", "text")
    await user.click(within(dialog).getByRole("button", { name: "Hide value" }))
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(trpc.credentials.update.mutate).toHaveBeenCalledWith({
        id: "sec-1",
        label: "API_KEY",
        value: "sk_new",
      }),
    )
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    cleanup()
    toastAdd.mockClear()
    trpc.credentials.update.mutate.mockRejectedValueOnce(new Error("nope"))
    renderWithProviders(<EditSecretDialog open onOpenChange={vi.fn()} secret={secret} />)
    await user.type(await screen.findByLabelText("Secret value"), "sk_new")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    )
  })

  it("requires a value and can cancel", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<EditSecretDialog open onOpenChange={onOpenChange} secret={secret} />)
    await user.click(await screen.findByRole("button", { name: "Save" }))
    expect(await screen.findByText("Enter the value")).toBeInTheDocument()
    await user.clear(screen.getByDisplayValue("API_KEY"))
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Enter the key")).toBeInTheDocument()
    expect(trpc.credentials.update.mutate).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("does not submit without an active secret", async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditSecretDialog open onOpenChange={vi.fn()} secret={null} />)
    await user.type(await screen.findByPlaceholderText("API_KEY"), "TOKEN")
    await user.type(screen.getByLabelText("Secret value"), "sk_new")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(trpc.credentials.update.mutate).not.toHaveBeenCalled()
  })
})
