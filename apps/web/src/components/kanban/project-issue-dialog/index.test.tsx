import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { sampleContact, sampleProject, sampleTool } from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"

vi.mock("@/lib/trpc", async () => {
  const { createTrpcMock } = await import("@/test/mocks")
  return { trpc: createTrpcMock() }
})

import { trpc } from "@/lib/trpc"

const updateProject = vi.fn()
const findContact = vi.fn((id: string) => (id === sampleContact.id ? sampleContact : undefined))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to }: { children?: ReactNode; to?: string }) => <a href={String(to)}>{children}</a>,
  }
})

vi.mock("@/lib/projects-store", () => ({
  useProjects: () => ({
    projects: [sampleProject],
    isPending: false,
    isError: false,
    addProject: vi.fn(),
    updateProject,
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject: vi.fn(),
    findProject: vi.fn(),
  }),
  ProjectsProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/lib/registry-store", () => ({
  useRegistry: () => ({
    contacts: [sampleContact],
    isPending: false,
    isContactsPending: false,
    isError: false,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    findContact,
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { ProjectIssueDialog } from "./index"

afterEach(() => {
  cleanup()
  updateProject.mockClear()
})

describe("ProjectIssueDialog", () => {
  it("renders nothing without a project", () => {
    const { container } = renderWithProviders(
      <ProjectIssueDialog project={undefined} contact={undefined} open onOpenChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows loading history then comments, repo and contact", async () => {
    trpc.audit.list.query.mockReturnValue(new Promise(() => {}))
    trpc.invoices.list.query.mockResolvedValue({ items: [], totals: { count: 0, paid: 0, overdue: 0 } })
    renderWithProviders(
      <ProjectIssueDialog project={sampleProject} contact={sampleContact} open onOpenChange={vi.fn()} />,
    )
    expect(await screen.findByText("Portal")).toBeInTheDocument()
    expect(screen.getByText("Loading…")).toBeInTheDocument()
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0)
    expect(screen.getByText("ada@test.local")).toBeInTheDocument()
    expect(screen.getByText("ada/portal")).toBeInTheDocument()
    expect(screen.getByText("Looks good")).toBeInTheDocument()
  })

  it("covers empty branches, comments and description editing", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    trpc.audit.list.query.mockResolvedValue({
      items: [
        {
          id: "a1",
          action: "project.update",
          changes: [
            { field: "name", from: "Old", to: "Portal" },
            { field: "clientId", from: "ghost", to: "c1" },
          ],
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      nextCursor: null,
    })
    trpc.invoices.list.query.mockResolvedValue({
      items: [{ id: "inv-1", status: "paid", amount: 10, currency: "BRL", generatedAt: "2026-01-01", payerName: "Ada", hasAttachment: false }],
      totals: { count: 1, paid: 1, overdue: 0 },
    })

    const emptyProject = {
      ...sampleProject,
      description: undefined,
      comments: undefined,
      repo: null,
      endedAt: undefined,
      tools: [{ ...sampleTool, billing: { ...sampleTool.billing!, cycle: "yearly" as const } }],
      deal: { kind: "upfront" as const, amount: 0, currency: "BRL" },
    }

    renderWithProviders(
      <ProjectIssueDialog project={emptyProject} contact={{ id: "c1", name: "Ada" }} open onOpenChange={onOpenChange} />,
    )

    expect(await screen.findByText("No description.")).toBeInTheDocument()
    expect(screen.getByText("No comments yet.")).toBeInTheDocument()
    expect(screen.getByText("No repository")).toBeInTheDocument()
    expect(screen.getByText("No monthly billing")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit description" }))
    const editor = screen.getByRole("textbox", { name: "Description" })
    await user.clear(editor)
    await user.type(editor, "New copy")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(updateProject).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Edit description" }))
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: "Edit description" }))
    await user.type(screen.getByRole("textbox", { name: "Description" }), "x")
    await user.keyboard("{Control>}{Enter}{/Control}")

    const comment = screen.getByPlaceholderText("Write a comment…")
    fireEvent.submit(comment.closest("form")!)
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled()
    await user.type(comment, "   ")
    fireEvent.submit(comment.closest("form")!)
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled()
    await user.clear(comment)
    await user.type(comment, "Ship it")
    await user.click(screen.getByRole("button", { name: "Comment" }))
    expect(updateProject).toHaveBeenCalled()

    await user.click(screen.getAllByRole("combobox").find((el) => el.textContent?.includes("In development") || el.textContent?.includes("Queued"))!)
    const completed = await screen.findByRole("option", { name: "Completed" })
    await user.click(completed)
    expect(updateProject).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }))
  })

  it("shows no paid tools and no history", async () => {
    trpc.audit.list.query.mockResolvedValue({ items: [], nextCursor: null })
    trpc.invoices.list.query.mockResolvedValue({ items: [], totals: { count: 0, paid: 0, overdue: 0 } })
    renderWithProviders(
      <ProjectIssueDialog
        project={{ ...sampleProject, tools: [], comments: [] }}
        contact={sampleContact}
        open
        onOpenChange={vi.fn()}
      />,
    )
    expect(await screen.findByText("No changes yet.")).toBeInTheDocument()
    expect(screen.getByText("No paid tools")).toBeInTheDocument()
  })

  it("clears the draft when the dialog closes", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    trpc.audit.list.query.mockResolvedValue({ items: [], nextCursor: null })
    renderWithProviders(
      <ProjectIssueDialog project={sampleProject} contact={sampleContact} open onOpenChange={onOpenChange} />,
    )
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByPlaceholderText("Write a comment…"), "draft")
    await user.click(within(dialog).getByRole("button", { name: "Close" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("saves an unchanged description and an empty description", async () => {
    const user = userEvent.setup()
    trpc.audit.list.query.mockResolvedValue({ items: [], nextCursor: null })
    renderWithProviders(
      <ProjectIssueDialog project={sampleProject} contact={sampleContact} open onOpenChange={vi.fn()} />,
    )
    await user.click(await screen.findByRole("button", { name: "Edit description" }))
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(updateProject).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Edit description" }))
    await user.clear(screen.getByRole("textbox", { name: "Description" }))
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(updateProject).toHaveBeenCalledWith(expect.objectContaining({ description: undefined }))
  })

  it("falls back when the contact is missing", async () => {
    trpc.audit.list.query.mockResolvedValue({ items: [], nextCursor: null })
    renderWithProviders(
      <ProjectIssueDialog project={sampleProject} contact={undefined} open onOpenChange={vi.fn()} />,
    )
    expect(await screen.findByText("—")).toBeInTheDocument()
  })
})
