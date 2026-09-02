import { vi } from "vitest"
import type { Project } from "@/data/projects"
import type { Contact } from "@/data/contacts"
import type { CustomTool } from "@/data/custom-tools"
import { emptyFilters, type DashboardMetrics, type WorkflowRun } from "shared"

export function emptyMetrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    options: { clients: [], projects: [], currencies: ["BRL"] },
    months: [],
    currency: "BRL",
    summary: {
      faturado: 0,
      recebido: 0,
      aReceber: 0,
      atrasado: 0,
      custo: 0,
      lucro: 0,
      margem: 0,
      clientes: 0,
      projetos: 0,
      foraDaMoeda: 0,
    },
    previous: {
      faturado: 0,
      recebido: 0,
      aReceber: 0,
      atrasado: 0,
      custo: 0,
      lucro: 0,
      margem: 0,
      clientes: 0,
      projetos: 0,
      foraDaMoeda: 0,
    },
    revenueByMonth: [],
    profitByProject: [],
    clientGrowth: [],
    rulerLanes: [],
    toolsSummary: {
      totalPeriodo: 0,
      eu: 0,
      cliente: 0,
      runRate: 0,
      pagas: 0,
      gratis: 0,
      maisCara: null,
      foraDaMoeda: 0,
    },
    toolCostByTool: [],
    toolCostByCategory: [],
    toolCostByMonth: [],
    toolRows: [],
    ...overrides,
  }
}

export function createTrpcMock() {
  return {
    audit: {
      list: { query: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) },
    },
    contacts: {
      list: { query: vi.fn().mockResolvedValue([] as Contact[]) },
      create: { mutate: vi.fn().mockResolvedValue({ id: "c1", name: "Ada" }) },
      update: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
      delete: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
    },
    dashboard: {
      metrics: { query: vi.fn().mockResolvedValue(emptyMetrics()) },
    },
    github: {
      status: {
        query: vi.fn().mockResolvedValue({ connected: false, login: null }),
      },
      connect: {
        mutate: vi.fn().mockResolvedValue({
          login: "ada",
        }),
      },
      disconnect: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
      repo: {
        query: vi.fn().mockResolvedValue({
          fullName: "ada/portal",
          defaultBranch: "main",
          isPrivate: true,
          branches: ["main", "dev"],
        }),
      },
      runs: {
        query: vi.fn().mockResolvedValue({
          branch: "main",
          defaultBranch: "main",
          isDefaultBranch: true,
          workflow: "none",
          runs: [] as WorkflowRun[],
        }),
      },
    },
    projects: {
      list: { query: vi.fn().mockResolvedValue([] as Project[]) },
      create: { mutate: vi.fn().mockResolvedValue({ id: "p1" }) },
      update: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
      move: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
      delete: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
    },
    invoices: {
      list: {
        query: vi.fn().mockResolvedValue({ items: [], totals: { count: 0, paid: 0, overdue: 0 } }),
      },
    },
    tools: {
      listCustom: { query: vi.fn().mockResolvedValue([] as CustomTool[]) },
      createCustom: {
        mutate: vi.fn().mockResolvedValue({ id: "t1", name: "CI", category: "deploy" }),
      },
      updateCustom: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
      deleteCustom: { mutate: vi.fn().mockResolvedValue({ ok: true as const }) },
    },
  }
}

export { emptyFilters }
