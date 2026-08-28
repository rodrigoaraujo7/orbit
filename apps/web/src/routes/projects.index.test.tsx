import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sampleContact, sampleProject } from "@/test/fixtures"
import { filterDrawer, renderWithProviders } from "@/test/render"

const otherProject = {
  ...sampleProject,
  id: "p2",
  name: "Shop",
  clientId: "missing-client",
  repo: null,
  tools: [{ ...sampleProject.tools[0]!, billing: undefined }],
  deal: { kind: "upfront" as const, amount: 100, currency: "BRL" },
}

const navigate = vi.fn((opts?: { search?: unknown }) => {
  if (opts && typeof opts.search === "function") {
    opts.search(search.value)
  }
})
const deleteProject = vi.fn().mockResolvedValue({ ok: true })
const toastAdd = vi.fn()
const search = vi.hoisted(() => ({ value: {} as Record<string, string | undefined> }))

vi.mock("@/lib/trpc", async () => {
  const { createTrpcMock } = await import("@/test/mocks")
  return { trpc: createTrpcMock() }
})

import { trpc } from "@/lib/trpc"

vi.mock("@/components/ui/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/toast")>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to, className }: { children?: ReactNode; to?: string; className?: string }) => (
      <a href={String(to)} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => navigate,
  }
})

vi.mock("@/lib/projects-store", () => ({
  useProjects: () => ({
    projects: [sampleProject, otherProject],
    isPending: false,
    isError: false,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject,
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
    findContact: (id: string) => (id === sampleContact.id ? sampleContact : undefined),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { Route } from "./projects.index"

const ProjectsPage = Route.options.component!

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  navigate.mockReset()
  toastAdd.mockClear()
  deleteProject.mockClear()
  deleteProject.mockResolvedValue({ ok: true })
  search.value = {}
  vi.spyOn(Route, "useSearch").mockImplementation(() => search.value as never)
  trpc.projects.list.query.mockResolvedValue([sampleProject, otherProject])
})

describe("projects index route", () => {
  it("parses search params", () => {
    expect(Route.options.validateSearch?.({ q: "", status: "queued" })).toMatchObject({ status: "queued" })
  })
  it("lists projects and navigates on row click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectsPage />)
    expect(await screen.findByText("Portal")).toBeInTheDocument()
    await user.click(screen.getByText("Portal"))
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/projects/$projectId" }),
    )
  })

  it("opens create, edit and delete flows", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectsPage />)
    await screen.findByText("Portal")
    await user.click(screen.getByRole("button", { name: /New project/ }))
    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument()
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }))

    await user.click(screen.getAllByRole("button", { name: "More actions" })[0]!)
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
    expect(await screen.findByText("Edit project")).toBeInTheDocument()
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }))

    await user.click(screen.getAllByRole("button", { name: "More actions" })[0]!)
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByRole("textbox"), "delete")
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))
    expect(deleteProject).toHaveBeenCalledWith("p1")
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
  })

  it("reports delete errors and shows the empty state", async () => {
    const user = userEvent.setup()
    deleteProject.mockImplementationOnce(() => {
      throw new Error("nope")
    })
    renderWithProviders(<ProjectsPage />)
    await screen.findByText("Portal")
    await user.click(screen.getAllByRole("button", { name: "More actions" })[0]!)
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByRole("textbox"), "delete")
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))

    trpc.projects.list.query.mockResolvedValue([])
    cleanup()
    renderWithProviders(<ProjectsPage />)
    expect(await screen.findByText("No projects match these filters.")).toBeInTheDocument()
  })

  it("patches search from the filter bar", async () => {
    const user = userEvent.setup()
    search.value = { q: "por", status: "queued", workflow: "success" }
    renderWithProviders(<ProjectsPage />)
    await screen.findByText("Portal")
    await user.type(screen.getByPlaceholderText("Search by name..."), "tal")
    await waitFor(() => expect(navigate).toHaveBeenCalled())

    await user.click(screen.getByRole("button", { name: "Filter" }))
    const drawer = filterDrawer()
    await user.click(drawer.getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole("option", { name: "All" }))
    await user.click(drawer.getAllByRole("combobox")[1]!)
    await user.click(await screen.findByRole("option", { name: "All" }))
    await user.click(drawer.getByRole("button", { name: "Clear" }))
  })

  it("patches desktop filters, github links and column sorts", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectsPage />)
    await screen.findByText("Portal")
    const status = screen.getAllByRole("combobox").find((el) => el.textContent?.includes("Status") || el.textContent?.includes("In development"))
    await user.click(status!)
    await user.click(await screen.findByRole("option", { name: "Queued" }))
    expect(navigate).toHaveBeenCalled()
    await user.click(status!)
    await user.click(await screen.findByRole("option", { name: "All" }))

    const workflow = screen.getAllByRole("combobox").find((el) => /GitHub|Passed|Actions/.test(el.textContent ?? ""))
    await user.click(workflow!)
    await user.click(await screen.findByRole("option", { name: "Passed" }))
    await user.click(workflow!)
    await user.click(await screen.findByRole("option", { name: "All" }))

    await user.click(screen.getByRole("link", { name: /ada\/portal/ }))
    expect(screen.getByText("Shop")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    await user.click(screen.getByRole("columnheader", { name: /Project/ }).querySelector("button")!)
    await user.click(screen.getByRole("columnheader", { name: /Status/ }).querySelector("button")!)
    await user.click(screen.getByRole("columnheader", { name: /Amount/ }).querySelector("button")!)
  })
})
