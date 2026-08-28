import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

const removeCustomTool = vi.fn().mockResolvedValue({ ok: true })
const toastAdd = vi.fn()
const tools = vi.hoisted(() => ({ list: [{ id: "t1", name: "CI", category: "deploy" as const }] }))

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
    customTools: tools.list,
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool,
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { CustomToolsPanel } from "./custom-tools-panel"

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
  removeCustomTool.mockClear()
  removeCustomTool.mockResolvedValue({ ok: true })
  tools.list = [{ id: "t1", name: "CI", category: "deploy" }]
})

async function confirm(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("dialog")
  await user.type(within(dialog).getByRole("textbox"), "delete")
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
}

describe("CustomToolsPanel", () => {
  it("opens create and edit dialogs", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomToolsPanel />)
    await user.click(screen.getByRole("button", { name: /New tool/ }))
    expect(await screen.findByText(/Register a tool outside the catalog/)).toBeInTheDocument()
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }))
    await user.click(screen.getByRole("button", { name: "More actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
    expect(await screen.findByText("Edit tool")).toBeInTheDocument()
  })

  it("deletes a tool and reports failures", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomToolsPanel />)
    await user.click(screen.getByRole("button", { name: "More actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    await confirm(user)
    expect(removeCustomTool).toHaveBeenCalledWith("t1")
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))

    removeCustomTool.mockImplementationOnce(() => {
      throw new Error("nope")
    })
    await user.click(screen.getByRole("button", { name: "More actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    await confirm(user)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not delete tool" }))
  })

  it("shows the empty table", () => {
    tools.list = []
    renderWithProviders(<CustomToolsPanel />)
    expect(screen.getByText("No tools registered.")).toBeInTheDocument()
  })

  it("sorts name and category", async () => {
    const user = userEvent.setup()
    tools.list = [
      { id: "t1", name: "CI", category: "deploy" },
      { id: "t2", name: "CRM", category: "other" },
    ]
    renderWithProviders(<CustomToolsPanel />)
    await user.click(screen.getByRole("columnheader", { name: /Name/ }).querySelector("button")!)
    await user.click(screen.getByRole("columnheader", { name: /Category/ }).querySelector("button")!)
  })
})
