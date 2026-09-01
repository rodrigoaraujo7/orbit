import { cleanup, screen, waitFor } from "@testing-library/react"
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

vi.mock("@dnd-kit/dom", () => ({
  PointerActivationConstraints: {
    Distance: class Distance {
      constructor(_options: { value: number }) {}
    },
  },
}))

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DragOverlay: () => null,
  KeyboardSensor: {},
  PointerSensor: { configure: () => ({}) },
  useDroppable: () => ({ ref: () => undefined, isDropTarget: false }),
}))

vi.mock("@dnd-kit/react/sortable", () => ({
  isSortable: () => false,
  useSortable: () => ({ ref: () => undefined, isDragging: false }),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to }: { children?: ReactNode; to?: string }) => (
      <a href={String(to)}>{children}</a>
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
    findProject: (id: string) => (id === sampleProject.id ? sampleProject : undefined),
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

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}))

import { Route } from "./kanban"

const KanbanPage = Route.options.component!

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  navigate.mockReset()
  search.value = {}
  vi.spyOn(Route, "useSearch").mockImplementation(() => search.value as never)
  vi.spyOn(Route, "useNavigate").mockReturnValue(navigate as never)
  trpc.projects.list.query.mockResolvedValue([sampleProject])
  trpc.audit.list.query.mockResolvedValue({ items: [], nextCursor: null })
  trpc.invoices.list.query.mockResolvedValue({
    items: [],
    totals: { count: 0, paid: 0, overdue: 0 },
  })
})

describe("kanban route", () => {
  it("parses search params", () => {
    expect(Route.options.validateSearch?.({ q: "", client: "c1" })).toMatchObject({ client: "c1" })
  })
  it("renders stats, board and opens a project", async () => {
    const user = userEvent.setup()
    renderWithProviders(<KanbanPage />)
    expect(await screen.findByText("Portal")).toBeInTheDocument()
    expect(screen.getByText("Kanban")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /New project/ }))
    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument()
  })

  it("shows the clear button when filters are active", async () => {
    const user = userEvent.setup()
    search.value = { q: "por", client: "c1", from: "2026-01", to: "2026-02" }
    renderWithProviders(<KanbanPage />)
    await screen.findByText("Portal")
    await user.click(screen.getAllByRole("button", { name: "Clear" })[0]!)
    expect(navigate).toHaveBeenCalled()

    const client = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent?.includes("Ada") || el.textContent?.includes("All clients"))
    await user.click(client!)
    const option = await screen
      .findByRole("option", { name: "Ada Lovelace" })
      .catch(() => screen.queryByRole("option", { name: "Ada" }))
    if (option) await user.click(option)

    await user.click(screen.getByRole("button", { name: "Filter" }))
    const drawer = filterDrawer()
    await user.click(drawer.getByRole("button", { name: "Start month" }))
    const jan = (await screen.findAllByRole("button")).find((button) =>
      /^jan/i.test(button.textContent ?? ""),
    )
    if (jan) await user.click(jan)
    await user.click(drawer.getByRole("button", { name: "End month" }))
    const feb = (await screen.findAllByRole("button")).find((button) =>
      /^feb/i.test(button.textContent ?? ""),
    )
    if (feb) await user.click(feb)
    await user.click(drawer.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "All clients" }))
    await user.click(drawer.getByRole("button", { name: "Clear" }))
  })

  it("updates desktop month filters and shows a zero completion rate", async () => {
    const user = userEvent.setup()
    trpc.projects.list.query.mockResolvedValue([])
    renderWithProviders(<KanbanPage />)
    expect(await screen.findByText("0%")).toBeInTheDocument()

    cleanup()
    trpc.projects.list.query.mockResolvedValue([sampleProject])
    search.value = { client: "c1" }
    renderWithProviders(<KanbanPage />)
    await screen.findByText("Portal")
    const client = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent?.includes("Ada") || el.textContent?.includes("All clients"))
    await user.click(client!)
    await user.click(await screen.findByRole("option", { name: "All clients" }))

    const start = screen.getByRole("button", { name: "Start month" })
    await user.click(start)
    const jan = (await screen.findAllByRole("button")).find((button) =>
      /^jan/i.test(button.textContent ?? ""),
    )
    if (jan) await user.click(jan)
    const end = screen.getByRole("button", { name: "End month" })
    await user.click(end)
    const feb = (await screen.findAllByRole("button")).find((button) =>
      /^feb/i.test(button.textContent ?? ""),
    )
    if (feb) await user.click(feb)

    search.value = { from: "2026-01", to: "2026-02" }
    cleanup()
    renderWithProviders(<KanbanPage />)
    await screen.findByText("Portal")
    await user.click(screen.getByRole("button", { name: "Start month" }))
    const fromClears = await screen.findAllByRole("button", { name: "Clear" })
    await user.click(fromClears[fromClears.length - 1]!)
    await user.click(screen.getByRole("button", { name: "End month" }))
    const toClears = await screen.findAllByRole("button", { name: "Clear" })
    await user.click(toClears[toClears.length - 1]!)
  })

  it("shows an em dash for an unknown client", async () => {
    trpc.projects.list.query.mockResolvedValue([
      { ...sampleProject, id: "p-orphan", name: "Orphan", clientId: "ghost" },
    ])
    renderWithProviders(<KanbanPage />)
    expect(await screen.findByText("Orphan")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("opens the issue dialog from a card", async () => {
    const user = userEvent.setup()
    renderWithProviders(<KanbanPage />)
    await user.click(await screen.findByText("Portal"))
    expect(await screen.findByText("Open project")).toBeInTheDocument()
  })

  it("commits a debounced search", async () => {
    const user = userEvent.setup()
    renderWithProviders(<KanbanPage />)
    await screen.findByText("Portal")
    await user.type(screen.getByPlaceholderText("Search by name..."), "shop")
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
