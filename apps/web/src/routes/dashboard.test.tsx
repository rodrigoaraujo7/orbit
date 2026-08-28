import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sampleContact, sampleProject } from "@/test/fixtures"
import { emptyMetrics } from "@/test/mocks"
import { renderWithProviders } from "@/test/render"

const navigate = vi.fn()
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
    Link: ({ children, to }: { children?: ReactNode; to?: string }) => <a href={String(to)}>{children}</a>,
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
    findContact: () => sampleContact,
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

import { Route } from "./dashboard"

const DashboardPage = Route.options.component!

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  navigate.mockReset()
  search.value = {}
  vi.spyOn(Route, "useSearch").mockImplementation(() => search.value as never)
  vi.spyOn(Route, "useNavigate").mockReturnValue(navigate as never)
  trpc.dashboard.metrics.query.mockResolvedValue(emptyMetrics())
})

describe("dashboard route", () => {
  it("parses search params", () => {
    expect(Route.options.validateSearch?.({ currency: "USD" })).toMatchObject({ currency: "USD" })
  })
  it("shows a skeleton while metrics load", () => {
    trpc.dashboard.metrics.query.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("No months in this period")).toBeInTheDocument()
  })

  it("renders metrics, skipped-currency copy and tab switch", async () => {
    const user = userEvent.setup()
    trpc.dashboard.metrics.query.mockResolvedValue(
      emptyMetrics({
        months: ["2026-01", "2026-02"],
        summary: {
          ...emptyMetrics().summary,
          lucro: 50,
          foraDaMoeda: 2,
        },
        previous: { ...emptyMetrics().previous, lucro: 25 },
        toolsSummary: {
          ...emptyMetrics().toolsSummary,
          maisCara: {
            key: "vercel",
            name: "Vercel",
            category: "deploy",
            eu: 1,
            cliente: 0,
            total: 1,
            projetos: ["Portal"],
          },
        },
      }),
    )
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText(/projects are in another currency/)).toBeInTheDocument()
    expect(screen.getByText(/above vs. the previous period/)).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: /Tools/ }))
    expect(await screen.findByText("Cost in period")).toBeInTheDocument()
  })

  it("covers profit hint branches and filter navigation", async () => {
    trpc.dashboard.metrics.query.mockResolvedValue(
      emptyMetrics({
        months: ["2026-01"],
        summary: { ...emptyMetrics().summary, lucro: 10 },
        previous: { ...emptyMetrics().previous, lucro: 0 },
      }),
    )
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText("No previous period to compare")).toBeInTheDocument()
    cleanup()

    trpc.dashboard.metrics.query.mockResolvedValue(
      emptyMetrics({
        months: ["2026-01"],
        summary: { ...emptyMetrics().summary, lucro: 0 },
        previous: { ...emptyMetrics().previous, lucro: 0 },
      }),
    )
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText("No activity in this period")).toBeInTheDocument()
    cleanup()

    trpc.dashboard.metrics.query.mockResolvedValue(
      emptyMetrics({
        months: ["2026-01"],
        summary: { ...emptyMetrics().summary, lucro: 10 },
        previous: { ...emptyMetrics().previous, lucro: 20 },
      }),
    )
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText(/below vs. the previous period/)).toBeInTheDocument()
  })

  it("writes compact search when filters change", async () => {
    const user = userEvent.setup()
    trpc.dashboard.metrics.query.mockResolvedValue(
      emptyMetrics({
        options: {
          clients: [{ id: "c1", name: "Ada" }],
          projects: [{ id: "p1", name: "Portal", clientId: "c1" }],
          currencies: ["BRL", "USD"],
        },
      }),
    )
    renderWithProviders(<DashboardPage />)
    await waitFor(() => expect(trpc.dashboard.metrics.query).toHaveBeenCalled())
    const client = screen.getAllByRole("combobox").find((el) => el.textContent?.includes("All clients"))
    await user.click(client!)
    await user.click(await screen.findByRole("option", { name: "Ada" }))
    expect(navigate).toHaveBeenCalled()

    const period = screen.getAllByRole("combobox").find((el) => /6 months|12 months|This year|All time|Period/.test(el.textContent ?? ""))
    await user.click(period!)
    await user.click(await screen.findByRole("option", { name: "All time" }))

    const currency = screen.getAllByRole("combobox").find((el) => el.textContent?.includes("BRL") || el.textContent?.includes("USD"))
    if (currency && !currency.textContent?.includes("BRL")) {
      await user.click(currency)
      await user.click(await screen.findByRole("option", { name: "BRL" }))
    } else if (currency) {
      await user.click(currency)
      await user.click(await screen.findByRole("option", { name: "USD" }))
      await user.click(currency)
      await user.click(await screen.findByRole("option", { name: "BRL" }))
    }
  })

  it("falls back when previous profit is missing", async () => {
    trpc.dashboard.metrics.query.mockResolvedValue(
      emptyMetrics({
        months: ["2026-01"],
        summary: { ...emptyMetrics().summary, lucro: 10 },
        previous: { ...emptyMetrics().previous, lucro: undefined as unknown as number },
      }),
    )
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText("No previous period to compare")).toBeInTheDocument()
  })
})
