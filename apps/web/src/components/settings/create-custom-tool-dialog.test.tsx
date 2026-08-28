import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { sampleCustomTool } from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"

const addCustomTool = vi.fn().mockResolvedValue(sampleCustomTool)
const updateCustomTool = vi.fn().mockResolvedValue({ ok: true })
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
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    findContact: vi.fn(),
    customTools: [],
    addCustomTool,
    updateCustomTool,
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { CreateCustomToolDialog } from "./create-custom-tool-dialog"

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
  addCustomTool.mockClear()
  updateCustomTool.mockClear()
  addCustomTool.mockResolvedValue(sampleCustomTool)
  updateCustomTool.mockResolvedValue({ ok: true })
})

describe("CreateCustomToolDialog", () => {
  it("creates a tool", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<CreateCustomToolDialog open onOpenChange={onOpenChange} />)
    await user.type(await screen.findByPlaceholderText("TOTVS Protheus"), "CI")
    await user.click(screen.getByRole("button", { name: "Create tool" }))
    await waitFor(() => expect(addCustomTool).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("updates a tool and reports errors", async () => {
    const user = userEvent.setup()
    updateCustomTool.mockRejectedValueOnce(new Error("nope"))
    renderWithProviders(<CreateCustomToolDialog open onOpenChange={vi.fn()} tool={sampleCustomTool} />)
    expect(await screen.findByText("Edit tool")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })))

    cleanup()
    toastAdd.mockClear()
    updateCustomTool.mockResolvedValue({ ok: true })
    renderWithProviders(<CreateCustomToolDialog open onOpenChange={vi.fn()} tool={sampleCustomTool} />)
    await user.click(await screen.findByRole("button", { name: "Save" }))
    await waitFor(() => expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })))
  })

  it("cancels without saving", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<CreateCustomToolDialog open onOpenChange={onOpenChange} />)
    await user.click(await screen.findByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("reports a create error", async () => {
    const user = userEvent.setup()
    addCustomTool.mockRejectedValueOnce(new Error("nope"))
    renderWithProviders(<CreateCustomToolDialog open onOpenChange={vi.fn()} />)
    await user.type(await screen.findByPlaceholderText("TOTVS Protheus"), "CI")
    await user.click(screen.getByRole("button", { name: "Create tool" }))
    await waitFor(() => {
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    })
  })
})
