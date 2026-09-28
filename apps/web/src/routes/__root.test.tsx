import { cleanup, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

const pathname = vi.hoisted(() => ({ value: "/" }))
const matches = vi.hoisted(() => ({
  value: [] as
    Array<{ status: string; _notFound?: boolean; pathname?: string; routeId?: string }> | undefined,
}))
const routerStatus = vi.hoisted(() => ({ value: "idle" as string | undefined }))
const session = vi.hoisted(() => ({
  data: { user: { id: "u1", name: "Ada", email: "ada@test.local" } } as {
    user: { id: string; name: string; email: string }
  } | null,
  isPending: false,
}))
const workspace = vi.hoisted(() => ({
  isPending: false,
  isError: false,
}))

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
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
    Outlet: () => <div data-testid="outlet">outlet</div>,
    useRouterState: (opts?: {
      select?: (state: {
        status?: string
        location: { pathname: string }
        matches: Array<{ status: string; _notFound?: boolean; pathname?: string; routeId?: string }>
      }) => unknown
    }) => {
      const state = {
        status: routerStatus.value,
        location: { pathname: pathname.value },
        matches: matches.value,
      }
      return opts?.select ? opts.select(state) : state
    },
  }
})

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: session.data, isPending: session.isPending }),
    signOut: vi.fn(),
  },
}))

vi.mock("@/lib/projects-store", () => ({
  useProjects: () => ({
    projects: [],
    isPending: workspace.isPending,
    isError: workspace.isError,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    moveProject: vi.fn(),
    replaceProjects: vi.fn(),
    deleteProject: vi.fn(),
    findProject: vi.fn(),
  }),
  ProjectsProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/lib/registry-store", () => ({
  useRegistry: () => ({
    contacts: [],
    isPending: workspace.isPending,
    isContactsPending: workspace.isPending,
    isError: workspace.isError,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    findContact: vi.fn(),
    customTools: [],
    addCustomTool: vi.fn(),
    updateCustomTool: vi.fn(),
    removeCustomTool: vi.fn(),
  }),
  RegistryProvider: ({ children }: { children: ReactNode }) => children,
}))

import { Route } from "./__root"

const Root = Route.options.component!

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  pathname.value = "/"
  matches.value = []
  routerStatus.value = "idle"
  session.data = { user: { id: "u1", name: "Ada", email: "ada@test.local" } }
  session.isPending = false
  workspace.isPending = false
  workspace.isError = false
})

describe("root Gate", () => {
  it("shows a loading screen while the session is pending", () => {
    session.isPending = true
    renderWithProviders(<Root />)
    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("keeps public routes mounted while the session is refetching", () => {
    session.isPending = true
    session.data = null
    pathname.value = "/login"
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
  })

  it("redirects anonymous users to login", () => {
    session.data = null
    pathname.value = "/dashboard"
    renderWithProviders(<Root />)
    expect(screen.getByTestId("navigate")).toHaveTextContent("/login")
  })

  it("still sends anonymous users to login when match data has not arrived", () => {
    session.data = null
    pathname.value = "/dashboard"
    matches.value = undefined
    renderWithProviders(<Root />)
    expect(screen.getByTestId("navigate")).toHaveTextContent("/login")
  })

  it("redirects signed-in users away from login", () => {
    pathname.value = "/login"
    renderWithProviders(<Root />)
    expect(screen.getByTestId("navigate")).toHaveTextContent("/")
  })

  it("renders the login outlet without the shell", () => {
    session.data = null
    pathname.value = "/login"
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument()
  })

  it("lets anonymous users reach the password recovery routes", () => {
    session.data = null
    for (const route of ["/forgot-password", "/reset-password"]) {
      pathname.value = route
      const { unmount } = renderWithProviders(<Root />)
      expect(screen.getByTestId("outlet")).toBeInTheDocument()
      unmount()
    }
  })

  it("shows the not-found outlet to anonymous users without the shell", () => {
    session.data = null
    pathname.value = "/this-page-does-not-exist"
    matches.value = [{ status: "success", _notFound: true }]
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument()
  })

  it("also treats a nested notFound match as a 404", () => {
    session.data = null
    pathname.value = "/this-page-does-not-exist"
    matches.value = [{ status: "notFound" }]
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
  })

  it("waits for the session before showing a not-found page", () => {
    session.isPending = true
    session.data = null
    pathname.value = "/this-page-does-not-exist"
    matches.value = [{ status: "success", _notFound: true }]
    renderWithProviders(<Root />)
    expect(screen.getByText("Loading…")).toBeInTheDocument()
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
  })

  it("shows the not-found outlet without the shell when the user is signed in", () => {
    pathname.value = "/this-page-does-not-exist"
    matches.value = [{ status: "success", _notFound: true }]
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument()
  })

  it("keeps the shell around a private page while the address bar moves to login", () => {
    pathname.value = "/login"
    routerStatus.value = "pending"
    matches.value = [{ routeId: "/dashboard", pathname: "/dashboard", status: "success" }]
    renderWithProviders(<Root />)
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument()
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
  })

  it("keeps the private outlet mounted while an anonymous redirect to login is in flight", () => {
    session.data = null
    pathname.value = "/login"
    routerStatus.value = "pending"
    matches.value = [{ routeId: "/dashboard", pathname: "/dashboard", status: "success" }]
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument()
  })

  it("does not swap in the stop screen while the next page is still loading", () => {
    pathname.value = "/projects"
    routerStatus.value = "pending"
    matches.value = [{ status: "success", _notFound: true }]
    renderWithProviders(<Root />)
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument()
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
  })

  it("shows the error outlet without the shell when a route throws", () => {
    pathname.value = "/dashboard"
    matches.value = [{ status: "error" }]
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument()
  })

  it("wraps authenticated pages in the shell", () => {
    renderWithProviders(<Root />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument()
  })

  it("shows workspace loading and error states", () => {
    workspace.isPending = true
    const { rerender } = renderWithProviders(<Root />)
    expect(screen.getByText("Loading…")).toBeInTheDocument()
    workspace.isPending = false
    workspace.isError = true
    rerender(<Root />)
    expect(screen.getByText("Could not load the data.")).toBeInTheDocument()
  })
})
