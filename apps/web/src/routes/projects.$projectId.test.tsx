import { act, cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  sampleContact,
  sampleInvoice,
  sampleProject,
  sampleTool,
  sampleWorkflowRun,
} from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"

vi.mock("@/lib/trpc", async () => {
  const { createTrpcMock } = await import("@/test/mocks")
  return { trpc: createTrpcMock() }
})

import { trpc } from "@/lib/trpc"

const navigate = vi.fn()
const routeNavigate = vi.fn((opts?: { search?: unknown }) => {
  if (opts && typeof opts.search === "function") {
    search.next = opts.search(search.value) as Record<string, string | undefined>
  }
})
const deleteProject = vi.fn()
const findProject = vi.fn((id: string) => (id === "p1" ? sampleProject : undefined))
const findContact = vi.fn(() => sampleContact)
const search = vi.hoisted(() => ({
  value: {} as Record<string, string | undefined>,
  next: {} as Record<string, string | undefined>,
}))
const params = vi.hoisted(() => ({ projectId: "p1" }))

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
    useNavigate: () => navigate,
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
    deleteProject,
    findProject,
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

import { Route } from "./projects.$projectId"

const ProjectDetailPage = Route.options.component!

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  navigate.mockReset()
  routeNavigate.mockReset()
  deleteProject.mockReset()
  params.projectId = "p1"
  search.value = {}
  search.next = {}
  findProject.mockImplementation((id: string) => (id === "p1" ? sampleProject : undefined))
  findContact.mockReturnValue(sampleContact)
  vi.spyOn(Route, "useParams").mockReturnValue(params as never)
  vi.spyOn(Route, "useSearch").mockImplementation(() => search.value as never)
  vi.spyOn(Route, "useNavigate").mockReturnValue(routeNavigate as never)
  trpc.invoices.list.query.mockResolvedValue({
    items: [sampleInvoice],
    totals: { count: 1, paid: 1, overdue: 0 },
  })
  trpc.github.status.query.mockClear()
  trpc.github.status.query.mockResolvedValue({
    connected: false,
    login: null,
    webhook: null,
  })
  trpc.github.repo.query.mockClear()
  trpc.github.repo.query.mockResolvedValue({
    fullName: "ada/portal",
    defaultBranch: "main",
    isPrivate: true,
    branches: ["main", "dev"],
  })
  trpc.github.runs.query.mockClear()
  trpc.github.runs.query.mockResolvedValue({
    branch: "main",
    defaultBranch: "main",
    isDefaultBranch: true,
    workflow: "none",
    runs: [],
  })
})

describe("project detail route", () => {
  it("parses search params", () => {
    expect(Route.options.validateSearch?.({ status: "paid", from: "" })).toMatchObject({
      status: "paid",
    })
  })
  it("shows not found", () => {
    params.projectId = "missing"
    findProject.mockReturnValue(undefined)
    renderWithProviders(<ProjectDetailPage />)
    expect(screen.getByText("Project not found.")).toBeInTheDocument()
    expect(screen.getByText("Back to the list")).toBeInTheDocument()
  })

  it("renders identity, finance, tools and edit dialogs", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetailPage />)
    expect(await screen.findByRole("heading", { name: "Portal" })).toBeInTheDocument()
    expect(screen.getByText("ada/portal")).toBeInTheDocument()
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Edit" }))
    expect(await screen.findByRole("heading", { name: "Edit project" })).toBeInTheDocument()
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }))

    await user.click(screen.getByRole("tab", { name: "Tools" }))
    expect((await screen.findAllByText("Vercel")).length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "Delete" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByRole("textbox"), "delete")
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))
    expect(deleteProject).toHaveBeenCalledWith("p1")
    expect(navigate).toHaveBeenCalledWith({ to: "/projects" })
  })

  it("edits finance and tools, patches invoice filters and uses default currency", async () => {
    const user = userEvent.setup()
    findProject.mockReturnValue({
      ...sampleProject,
      tools: [
        {
          ...sampleTool,
          billing: {
            amount: 20,
            cycle: "monthly" as const,
            nextInvoice: "2026-09-01",
            payer: "me" as const,
          },
        },
      ],
    })
    findContact.mockReturnValue({ id: "c1", name: "Ada Lovelace" })
    renderWithProviders(<ProjectDetailPage />)
    expect(await screen.findByRole("heading", { name: "Portal" })).toBeInTheDocument()
    const tooltipTriggers = screen
      .getAllByRole("button")
      .filter((el) => el.hasAttribute("data-base-ui-tooltip-trigger"))
    await user.click(tooltipTriggers[0]!)
    await user.click(tooltipTriggers[1]!)
    await user.click(tooltipTriggers[2]!)
    expect(await screen.findByText("Edit finance")).toBeInTheDocument()
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }))

    await user.click(screen.getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole("option", { name: "Paid" }))
    expect(routeNavigate).toHaveBeenCalled()

    await user.click(screen.getAllByRole("combobox")[0]!)
    await user.click(await screen.findByRole("option", { name: /All/ }))

    search.value = { from: "2026-01" }
    cleanup()
    renderWithProviders(<ProjectDetailPage />)
    expect(await screen.findByRole("heading", { name: "Portal" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "From" }))
    await user.click(await screen.findByRole("button", { name: "Clear" }))
    expect(routeNavigate).toHaveBeenCalled()

    search.value = { to: "2026-02" }
    cleanup()
    renderWithProviders(<ProjectDetailPage />)
    expect(await screen.findByRole("heading", { name: "Portal" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "To" }))
    await user.click(await screen.findByRole("button", { name: "Clear" }))
    expect(routeNavigate).toHaveBeenCalled()

    await user.click(screen.getByRole("tab", { name: "Tools" }))
    const toolTriggers = screen
      .getAllByRole("button")
      .filter((el) => el.hasAttribute("data-base-ui-tooltip-trigger"))
    await user.click(toolTriggers[toolTriggers.length - 2]!)
    await user.click(toolTriggers[toolTriggers.length - 1]!)
    expect(await screen.findByText("Edit tools")).toBeInTheDocument()
  })

  it("shows invoice skeleton while the query is pending", () => {
    trpc.invoices.list.query.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ProjectDetailPage />)
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument()
  })

  it("covers free deals, missing contact and empty tools", async () => {
    findProject.mockReturnValue({
      ...sampleProject,
      repo: null,
      tools: [],
      deal: { kind: "upfront" as const, amount: 0, currency: "BRL" },
    })
    findContact.mockReturnValue(undefined)
    trpc.invoices.list.query.mockResolvedValue({
      items: [],
      totals: { count: 0, paid: 0, overdue: 0 },
    })
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetailPage />)
    expect((await screen.findAllByText("Free")).length).toBeGreaterThan(0)
    expect(screen.getByText("—")).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Tools" }))
    expect(await screen.findByText("No paid tools")).toBeInTheDocument()
    expect(screen.getByText("No tools registered.")).toBeInTheDocument()
  })

  it("covers paid tools without monthly billing", async () => {
    const user = userEvent.setup()
    findProject.mockReturnValue({
      ...sampleProject,
      tools: [{ ...sampleTool, billing: { ...sampleTool.billing!, cycle: "yearly" } }],
      repo: { ...sampleProject.repo!, workflow: "running" },
    })
    renderWithProviders(<ProjectDetailPage />)
    await user.click(screen.getByRole("tab", { name: /Tools/ }))
    expect(await screen.findByText("No monthly billing")).toBeInTheDocument()
  })
})

/** jsdom has no EventSource; this one lets a test push a run down the stream. */
class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>()

  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  emit(type: string, data = "") {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data } as MessageEvent<string>)
    }
  }

  close() {}
}

function pushRun(run: typeof sampleWorkflowRun, branch = "main") {
  const source = FakeEventSource.instances[FakeEventSource.instances.length - 1]!
  act(() =>
    source.emit(
      "run",
      JSON.stringify({ repo: "ada/portal", branch, run, source: "webhook" as const }),
    ),
  )
}

describe("project detail GitHub tab", () => {
  async function openGithubTab() {
    const user = userEvent.setup()
    const view = renderWithProviders(<ProjectDetailPage />)
    expect(await screen.findByRole("heading", { name: "Portal" })).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "GitHub" }))
    return { user, ...view }
  }

  function connectGithub() {
    trpc.github.status.query.mockResolvedValue({
      connected: true,
      login: "ada",
      webhook: null,
    })
  }

  it("keeps the branch in the URL search", () => {
    expect(Route.options.validateSearch?.({ branch: "dev" })).toMatchObject({ branch: "dev" })
  })

  it("asks the user to connect GitHub first", async () => {
    await openGithubTab()
    expect(await screen.findByText(/Connect GitHub in settings/)).toBeInTheDocument()
    expect(trpc.github.runs.query).not.toHaveBeenCalled()
  })

  it("says a project without a repository has nothing to show", async () => {
    findProject.mockReturnValue({ ...sampleProject, repo: null })
    await openGithubTab()
    expect(await screen.findByText(/This project has no repository/)).toBeInTheDocument()
  })

  it("lists the runs of the default branch and turns the header badge live", async () => {
    connectGithub()
    trpc.github.runs.query.mockResolvedValue({
      branch: "main",
      defaultBranch: "main",
      isDefaultBranch: true,
      workflow: "failure",
      runs: [sampleWorkflowRun, { ...sampleWorkflowRun, id: 102, runNumber: 43, name: "release" }],
    })

    const { container } = await openGithubTab()
    expect(await screen.findByText("release")).toBeInTheDocument()
    expect(trpc.github.runs.query).toHaveBeenCalledWith({ projectId: "p1", branch: undefined })
    // The fixture is cached as "success" and both runs passed, so the failure
    // icon can only be the header badge following the live default-branch read.
    expect(container.querySelectorAll(".lucide-circle-x")).toHaveLength(1)
  })

  it("moves to another branch through the URL", async () => {
    connectGithub()
    const { user } = await openGithubTab()

    await vi.waitFor(() => expect(screen.getByRole("combobox", { name: "Branch" })).toBeEnabled())
    await user.click(screen.getByRole("combobox", { name: "Branch" }))
    await user.click(await screen.findByRole("option", { name: /dev/ }))
    expect(routeNavigate).toHaveBeenCalled()
  })

  it("reports a failed read", async () => {
    connectGithub()
    trpc.github.runs.query.mockRejectedValue(new Error("rate limited"))

    await openGithubTab()
    expect(await screen.findByText("Could not load the Actions runs.")).toBeInTheDocument()
  })

  it("refetches on demand from the header", async () => {
    connectGithub()
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetailPage />)
    expect(await screen.findByRole("heading", { name: "Portal" })).toBeInTheDocument()
    await vi.waitFor(() => expect(trpc.github.runs.query).toHaveBeenCalledTimes(1))

    const refresh = screen
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("data-base-ui-tooltip-trigger"))[0]!
    await user.click(refresh)
    await vi.waitFor(() => expect(trpc.github.runs.query).toHaveBeenCalledTimes(2))
  })

  it("clears the branch from the URL when the default one is picked", async () => {
    connectGithub()
    search.value = { branch: "dev" }
    trpc.github.runs.query.mockResolvedValue({
      branch: "dev",
      defaultBranch: "main",
      isDefaultBranch: false,
      workflow: "none",
      runs: [],
    })
    const { user } = await openGithubTab()

    await vi.waitFor(() => expect(screen.getByRole("combobox", { name: "Branch" })).toBeEnabled())
    await user.click(screen.getByRole("combobox", { name: "Branch" }))
    await user.click(await screen.findByRole("option", { name: /main/ }))
    expect(routeNavigate).toHaveBeenCalled()
    expect(search.next.branch).toBeUndefined()
  })
})

describe("project detail live stream", () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal("EventSource", FakeEventSource)
    trpc.github.status.query.mockResolvedValue({
      connected: true,
      login: "ada",
      webhook: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("adds a run pushed over the stream and refreshes the projects list", async () => {
    trpc.github.runs.query.mockResolvedValue({
      branch: "main",
      defaultBranch: "main",
      isDefaultBranch: true,
      workflow: "success",
      runs: [sampleWorkflowRun],
    })
    const user = userEvent.setup()
    const { client } = renderWithProviders(<ProjectDetailPage />)
    const invalidate = vi.spyOn(client, "invalidateQueries")

    await user.click(await screen.findByRole("tab", { name: "GitHub" }))
    expect(await screen.findByText("ci")).toBeInTheDocument()
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
    expect(FakeEventSource.instances[0]!.url).toContain("branch=main")

    pushRun({
      ...sampleWorkflowRun,
      id: 999,
      name: "release",
      status: "running",
      durationMs: null,
      startedAt: "2026-09-02T10:00:00.000Z",
    })

    expect(await screen.findByText("release")).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["projects"] })
  })

  it("drops a pushed run while the list is still loading", async () => {
    search.value = { branch: "dev" }
    trpc.github.runs.query.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    const { client } = renderWithProviders(<ProjectDetailPage />)
    const invalidate = vi.spyOn(client, "invalidateQueries")

    await user.click(await screen.findByRole("tab", { name: "GitHub" }))
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))

    pushRun({ ...sampleWorkflowRun, id: 999, name: "release" }, "dev")

    expect(screen.queryByText("release")).not.toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["projects"] })
  })
})
