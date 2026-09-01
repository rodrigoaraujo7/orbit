import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { sampleContact } from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"

const addContact = vi.fn().mockResolvedValue(sampleContact)
const updateContact = vi.fn().mockResolvedValue({ ok: true })
const toastAdd = vi.fn()

vi.mock("@/components/ui/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/toast")>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

vi.mock("@/lib/registry-store", () => ({
  useRegistry: () => ({
    contacts: [],
    isPending: false,
    isContactsPending: false,
    isError: false,
    addContact,
    updateContact,
    removeContact: vi.fn(),
    findContact: vi.fn(),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { CreateContactDialog } from "./index"

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
  addContact.mockClear()
  updateContact.mockClear()
  addContact.mockResolvedValue(sampleContact)
  updateContact.mockResolvedValue({ ok: true })
})

describe("CreateContactDialog", () => {
  it("creates a contact", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<CreateContactDialog open onOpenChange={onOpenChange} />)
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByPlaceholderText("Marcelo Tavares"), "Ada")
    await user.type(within(dialog).getByPlaceholderText("marcelo@company.com"), "ada@test.local")
    await user.type(within(dialog).getByPlaceholderText("(11) 98765-4321"), "11988887777")
    await user.type(within(dialog).getByPlaceholderText("Acme Ltd"), "Lab")
    await user.click(within(dialog).getByRole("button", { name: "Create contact" }))
    await waitFor(() => expect(addContact).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("updates a contact and reports errors", async () => {
    const user = userEvent.setup()
    updateContact.mockRejectedValueOnce(new Error("nope"))
    renderWithProviders(<CreateContactDialog open onOpenChange={vi.fn()} contact={sampleContact} />)
    expect(await screen.findByText("Edit contact")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    )

    cleanup()
    toastAdd.mockClear()
    updateContact.mockResolvedValue({ ok: true })
    renderWithProviders(<CreateContactDialog open onOpenChange={vi.fn()} contact={sampleContact} />)
    await user.click(await screen.findByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })),
    )
  })

  it("rejects an invalid email", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateContactDialog open onOpenChange={vi.fn()} />)
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByPlaceholderText("Marcelo Tavares"), "Ada")
    await user.type(within(dialog).getByPlaceholderText("marcelo@company.com"), "not-an-email")
    await user.type(within(dialog).getByPlaceholderText("(11) 98765-4321"), "11988887777")
    await user.type(within(dialog).getByPlaceholderText("Acme Ltd"), "Lab")
    fireEvent.submit(dialog.querySelector("form")!)
    expect(await screen.findByText("Invalid email")).toBeInTheDocument()
    expect(addContact).not.toHaveBeenCalled()
  })

  it("cancels without saving", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<CreateContactDialog open onOpenChange={onOpenChange} />)
    await user.click(await screen.findByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("prefills empty optional fields and omits a blank email", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CreateContactDialog
        open
        onOpenChange={vi.fn()}
        contact={{ id: "c-empty", name: "No Mail" }}
      />,
    )
    expect(await screen.findByText("Edit contact")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("marcelo@company.com")).toHaveValue("")
    await user.type(screen.getByPlaceholderText("(11) 98765-4321"), "11988887777")
    await user.type(screen.getByPlaceholderText("Acme Ltd"), "Lab")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(updateContact).toHaveBeenCalledWith(
        "c-empty",
        expect.objectContaining({ email: undefined }),
      ),
    )
  })

  it("reports a create error", async () => {
    const user = userEvent.setup()
    addContact.mockRejectedValueOnce(new Error("nope"))
    renderWithProviders(<CreateContactDialog open onOpenChange={vi.fn()} />)
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByPlaceholderText("Marcelo Tavares"), "Ada")
    await user.type(within(dialog).getByPlaceholderText("(11) 98765-4321"), "11988887777")
    await user.type(within(dialog).getByPlaceholderText("Acme Ltd"), "Lab")
    await user.click(within(dialog).getByRole("button", { name: "Create contact" }))
    await waitFor(() => {
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    })
  })
})
