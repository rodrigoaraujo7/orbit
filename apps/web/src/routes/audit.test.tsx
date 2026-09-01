import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sampleContact, sampleProject } from "@/test/fixtures"
import { filterDrawer, renderWithProviders } from "@/test/render"

const navigate = vi.fn((opts?: { search?: unknown }) => {
  if (opts && typeof opts.search === "function") {
    opts.search(search.value)
  }
})
const search = vi.hoisted(() => ({ value: {} as Record<string, string | undefined> }))

vi.mock("@/lib/trpc", async () => {
  const { createTrpcMock } = await import("@/test/mocks")
  return { trpc: createTrpcMock() }
})

import { trpc } from "@/lib/trpc"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      className,
    }: {
      children?: ReactNode
      to?: string
      className?: string
    }) => (
      <a href={String(to)} className={className}>
        {children}
      </a>
    ),
  }
})

vi.mock("@/lib/projects-store", () => ({
  useProjects: () => ({
    projects: [sampleProject],
    isPending: false,
    isError: false,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject: vi.fn(),
    findProject: (id: string) => (id === "p1" ? sampleProject : undefined),
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
    findContact: (id: string) => (id === sampleContact.id ? sampleContact : undefined),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { Route } from "./audit"

const AuditPage = Route.options.component!

const entry = {
  id: "a1",
  module: "project" as const,
  action: "project.update",
  subjectId: "p1",
  subjectLabel: "Portal",
  projectId: "p1",
  changes: [
    { field: "name", from: "Old", to: "Portal" },
    { field: "clientId", from: "ghost", to: "c1" },
  ],
  createdAt: "2026-01-01T12:00:00.000Z",
  ip: "1.1.1.1",
  userAgent: "Vitest",
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  navigate.mockReset()
  search.value = {}
  vi.spyOn(Route, "useSearch").mockImplementation(() => search.value as never)
  vi.spyOn(Route, "useNavigate").mockReturnValue(navigate as never)
  trpc.audit.list.query.mockResolvedValue({
    items: [entry],
    nextCursor: { createdAt: "x", id: "a2" },
  })
})

describe("audit route", () => {
  it("parses search params", () => {
    expect(Route.options.validateSearch?.({ q: "", module: "project" })).toMatchObject({
      module: "project",
    })
  })
  it("lists events and opens details", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuditPage />)
    expect(await screen.findByText("Portal")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "View details" }))
    expect(await screen.findByText("Changes")).toBeInTheDocument()
    expect(screen.getByText("1.1.1.1")).toBeInTheDocument()
    expect(screen.getByText("Vitest")).toBeInTheDocument()
  })

  it("shows empty, error and details without extras", async () => {
    const user = userEvent.setup()
    trpc.audit.list.query.mockResolvedValue({
      items: [
        {
          ...entry,
          id: "a2",
          projectId: null,
          subjectLabel: null,
          changes: [],
          ip: null,
          userAgent: null,
          module: "security",
        },
      ],
      nextCursor: null,
    })
    renderWithProviders(<AuditPage />)
    expect(await screen.findByText("—")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "View details" }))
    expect(screen.queryByText("IP")).not.toBeInTheDocument()

    cleanup()
    trpc.audit.list.query.mockRejectedValue(new Error("fail"))
    renderWithProviders(<AuditPage />)
    expect(await screen.findByText("Could not load the audit log.")).toBeInTheDocument()

    cleanup()
    trpc.audit.list.query.mockResolvedValue({ items: [], nextCursor: null })
    renderWithProviders(<AuditPage />)
    expect(await screen.findByText("No events match these filters.")).toBeInTheDocument()
  })

  it("paginates, sorts and shows custom period fields", async () => {
    const user = userEvent.setup()
    search.value = {
      period: "custom",
      from: "2026-01-01",
      to: "2026-02-01",
      module: "project",
      q: "por",
    }
    renderWithProviders(<AuditPage />)
    await screen.findByText("Portal")
    await user.click(screen.getByRole("button", { name: "Next page" }))
    await user.click(screen.getByRole("columnheader", { name: /Date/ }).querySelector("button")!)
    const period = screen.getAllByRole("combobox").find((el) => el.textContent?.includes("Custom"))
    await user.click(period!)
    await user.click(await screen.findByRole("option", { name: "All time" }))
    await user.click(period!)
    await user.click(await screen.findByRole("option", { name: "Custom" }))
    expect(navigate).toHaveBeenCalled()

    const moduleSelect = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent?.includes("Project"))
    await user.click(moduleSelect!)
    await user.click(await screen.findByRole("option", { name: "Kanban" }))

    await user.click(screen.getByRole("button", { name: "Filter" }))
    const drawer = filterDrawer()
    fireEvent.change(drawer.getByLabelText("From"), { target: { value: "2026-01-20" } })
    fireEvent.change(drawer.getByLabelText("To"), { target: { value: "" } })
    await user.click(drawer.getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole("option", { name: "Kanban" }))
    await user.click(drawer.getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole("option", { name: "All modules" }))
    await user.click(drawer.getAllByRole("combobox")[1]!)
    await user.click(await screen.findByRole("option", { name: "30 days" }))
    await user.click(drawer.getAllByRole("combobox")[1]!)
    await user.click(await screen.findByRole("option", { name: "Custom" }))
    await user.click(drawer.getByRole("button", { name: "Clear" }))
  })

  it("edits custom dates, paginates backward and closes details", async () => {
    const user = userEvent.setup()
    search.value = { period: "custom", from: "2026-01-01", to: "2026-02-01" }
    renderWithProviders(<AuditPage />)
    await screen.findByText("Portal")

    const from = screen.getByLabelText("From")
    fireEvent.change(from, { target: { value: "2026-01-15" } })
    fireEvent.change(from, { target: { value: "" } })
    const to = screen.getByLabelText("To")
    fireEvent.change(to, { target: { value: "" } })
    expect(navigate).toHaveBeenCalled()

    await user.click(screen.getByRole("columnheader", { name: /Module/ }).querySelector("button")!)
    const pageSize = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent?.includes("25 per page"))
    await user.click(pageSize!)
    await user.click(await screen.findByRole("option", { name: "10 per page" }))

    await user.click(screen.getByRole("button", { name: "Next page" }))
    await user.click(screen.getByRole("button", { name: "Previous page" }))

    const moduleSelect = screen
      .getAllByRole("combobox")
      .find((el) => /Module|Project|All/.test(el.textContent ?? ""))
    await user.click(moduleSelect!)
    const all = await screen.findByRole("option", { name: "All modules" })
    await user.click(all)

    await user.click(screen.getByRole("button", { name: "View details" }))
    expect(await screen.findByText("Changes")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Close" }))

    cleanup()
    trpc.audit.list.query.mockResolvedValue({ items: [entry], nextCursor: null })
    renderWithProviders(<AuditPage />)
    await screen.findByText("Portal")
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
  })

  it("commits search text", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuditPage />)
    await screen.findByText("Portal")
    await user.type(screen.getByPlaceholderText("Search by action or object..."), "login")
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
