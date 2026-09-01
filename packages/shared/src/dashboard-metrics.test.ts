import { afterEach, describe, expect, it, vi } from "vitest"
import { monthRange } from "./dates.ts"
import {
  applyFilters,
  availableCurrencies,
  buildDashboardMetrics,
  CATEGORY_SLOT,
  clientGrowth,
  dashboardOptions,
  dataRange,
  dealCurrency,
  emptyFilters,
  financeSummary,
  monthlyToolCost,
  paymentRulerLanes,
  previousMonths,
  profitByProject,
  resolveMonths,
  revenueByMonth,
  toDashboardFilters,
  toolCostByCategory,
  toolCostByMonth,
  toolCostByTool,
  toolCostInMonth,
  toolCurrency,
  toolRows,
  toolsSummary,
} from "./dashboard-metrics.ts"
import type { Project, Tool } from "./project.ts"

afterEach(() => {
  vi.useRealTimers()
})

function tool(overrides: Partial<Tool> & { billing?: Tool["billing"] }): Tool {
  return {
    id: "aws",
    name: "AWS",
    category: "deploy",
    secrets: [],
    ...overrides,
  }
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Projeto",
    clientId: "c1",
    status: "in-development",
    startedAt: "2026-01-10",
    deal: { kind: "upfront", amount: 0 },
    tools: [],
    repo: null,
    ...overrides,
  }
}

describe("filter helpers", () => {
  it("fills dashboard filters with defaults", () => {
    expect(toDashboardFilters()).toEqual(emptyFilters)
    expect(toDashboardFilters({ currency: "" }).currency).toBe("BRL")
    expect(
      toDashboardFilters({
        monthFrom: "2026-01",
        projectId: "p1",
        clientId: "c1",
        currency: "USD",
      }),
    ).toEqual({
      monthFrom: "2026-01",
      monthTo: "",
      projectId: "p1",
      clientId: "c1",
      currency: "USD",
    })
  })

  it("resolves deal and tool currencies", () => {
    expect(dealCurrency(project())).toBe("BRL")
    expect(dealCurrency(project({ deal: { kind: "upfront", amount: 10, currency: "USD" } }))).toBe(
      "USD",
    )
    expect(toolCurrency(tool({}))).toBe("BRL")
    expect(
      toolCurrency(
        tool({
          billing: {
            amount: 1,
            cycle: "monthly",
            nextInvoice: "2026-01-01",
            payer: "me",
            currency: "EUR",
          },
        }),
      ),
    ).toBe("EUR")
  })

  it("filters by project and client", () => {
    const rows = [project({ id: "a", clientId: "c1" }), project({ id: "b", clientId: "c2" })]
    expect(applyFilters(rows, { ...emptyFilters, projectId: "a" }).map((row) => row.id)).toEqual([
      "a",
    ])
    expect(applyFilters(rows, { ...emptyFilters, clientId: "c2" }).map((row) => row.id)).toEqual([
      "b",
    ])
    expect(applyFilters(rows, emptyFilters)).toHaveLength(2)
  })

  it("lists currencies present in deals and billed tools", () => {
    const rows = [
      project({
        deal: { kind: "upfront", amount: 1, currency: "USD" },
        tools: [
          tool({
            billing: {
              amount: 1,
              cycle: "monthly",
              nextInvoice: "2026-01-01",
              payer: "me",
              currency: "EUR",
            },
          }),
          tool({ id: "free", name: "Free" }),
        ],
      }),
    ]
    expect(availableCurrencies(rows)).toEqual(["BRL", "EUR", "USD"])
  })
})

describe("dataRange / resolveMonths", () => {
  it("uses today when there are no projects", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    expect(dataRange([])).toEqual({ from: "2026-06", to: "2026-06" })
  })

  it("spans start, end, future invoices and a start after today", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 1, 1))
    const range = dataRange([
      project({ startedAt: "2026-01-10", endedAt: "2026-04-20" }),
      project({
        id: "p2",
        startedAt: "2026-08-01",
        deal: { kind: "installment", amount: 3000, installments: 3 },
      }),
    ])
    expect(range.from).toBe("2026-01")
    expect(range.to).toBe("2026-10")

    vi.setSystemTime(new Date(2026, 5, 15))
    expect(
      dataRange([
        project({ startedAt: "2026-06-01" }),
        project({ id: "p-earlier", startedAt: "2026-01-01" }),
      ]).from,
    ).toBe("2026-01")
  })

  it("respects explicit month filters", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    expect(
      resolveMonths([project()], { ...emptyFilters, monthFrom: "2026-03", monthTo: "2026-04" }),
    ).toEqual(["2026-03", "2026-04"])
  })
})

describe("costs and revenue", () => {
  it("normalizes billing cycles", () => {
    expect(
      monthlyToolCost(
        tool({
          billing: { amount: 100, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
        }),
      ),
    ).toBe(100)
    expect(
      monthlyToolCost(
        tool({
          billing: { amount: 1200, cycle: "yearly", nextInvoice: "2026-01-05", payer: "me" },
        }),
      ),
    ).toBeCloseTo(100)
    expect(
      monthlyToolCost(
        tool({
          billing: { amount: 500, cycle: "one-off", nextInvoice: "2026-01-05", payer: "me" },
        }),
      ),
    ).toBe(0)
    expect(monthlyToolCost(tool({}))).toBe(0)
  })

  it("charges one-off and recurring tools only while the project is alive", () => {
    const oneOff = tool({
      billing: { amount: 500, cycle: "one-off", nextInvoice: "2026-03-20", payer: "me" },
    })
    const running = project({ tools: [oneOff] })
    expect(toolCostInMonth(oneOff, running, "2026-03")).toBe(500)
    expect(toolCostInMonth(oneOff, running, "2026-04")).toBe(0)
    expect(toolCostInMonth(oneOff, running, "2025-12")).toBe(0)
    expect(toolCostInMonth(tool({}), running, "2026-03")).toBe(0)

    const monthly = tool({
      billing: { amount: 80, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
    })
    const finished = project({
      status: "completed",
      endedAt: "2026-02-28",
      tools: [monthly],
    })
    expect(toolCostInMonth(monthly, finished, "2026-02")).toBe(80)
    expect(toolCostInMonth(monthly, finished, "2026-03")).toBe(0)
    expect(
      toolCostByMonth([finished], monthRange("2026-01", "2026-04"), "BRL").map((month) => month.eu),
    ).toEqual([80, 80, 0, 0])
  })

  it("splits tool cost by payer, skips zero months and other currencies", () => {
    const shared = project({
      tools: [
        tool({
          id: "aws",
          name: "AWS",
          billing: { amount: 300, cycle: "monthly", nextInvoice: "2026-01-05", payer: "client" },
        }),
        tool({
          id: "neon",
          name: "Neon",
          billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
        }),
        tool({ id: "free", name: "Free" }),
        tool({
          id: "usd",
          name: "USD Tool",
          billing: {
            amount: 9,
            cycle: "monthly",
            nextInvoice: "2026-01-05",
            payer: "me",
            currency: "USD",
          },
        }),
      ],
    })
    const costs = toolCostByTool([shared], monthRange("2026-01", "2026-01"), "BRL")
    expect(costs).toHaveLength(2)
    expect(costs[0]).toMatchObject({ name: "AWS", cliente: 300, eu: 0 })
    expect(costs[1]).toMatchObject({ eu: 20 })
    expect(toolCostByMonth([shared], monthRange("2026-01", "2026-01"), "BRL")[0]).toMatchObject({
      eu: 20,
      cliente: 300,
    })

    const again = project({
      id: "p2",
      name: "Outro",
      tools: [
        tool({
          id: "aws",
          name: "AWS",
          billing: { amount: 10, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
        }),
      ],
    })
    const merged = toolCostByTool([shared, again], monthRange("2026-01", "2026-01"), "BRL")
    const aws = merged.find((row) => row.name === "AWS")
    expect(aws?.projetos).toEqual(["Projeto", "Outro"])
    expect(aws?.eu).toBe(10)

    const sameName = project({
      id: "p3",
      name: "Projeto",
      tools: [
        tool({
          id: "aws",
          name: "AWS",
          billing: { amount: 10, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
        }),
      ],
    })
    const duplicated = toolCostByTool([shared, sameName], monthRange("2026-01", "2026-01"), "BRL")
    expect(duplicated.find((row) => row.name === "AWS")?.projetos).toEqual(["Projeto"])

    const oneOffOutside = project({
      tools: [
        tool({
          id: "setup",
          name: "Setup",
          billing: { amount: 500, cycle: "one-off", nextInvoice: "2026-03-01", payer: "me" },
        }),
      ],
    })
    expect(toolCostByTool([oneOffOutside], monthRange("2026-01", "2026-01"), "BRL")).toEqual([])
  })

  it("folds extra categories into the other slot", () => {
    expect(CATEGORY_SLOT.payments).toBe(6)
    const categorized = toolCostByCategory(
      [
        project({
          tools: [
            tool({
              id: "vercel",
              name: "Vercel",
              category: "deploy",
              billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
            }),
            tool({
              id: "stripe",
              name: "Stripe",
              category: "payments",
              billing: { amount: 10, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
            }),
            tool({
              id: "openai",
              name: "OpenAI",
              category: "ai",
              billing: { amount: 5, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
            }),
          ],
        }),
      ],
      monthRange("2026-01", "2026-01"),
      "BRL",
    )
    expect(categorized).toHaveLength(2)
    expect(categorized[0]).toMatchObject({ key: "deploy", slot: 1 })
    expect(categorized[1]).toMatchObject({ key: "other", total: 15 })
  })

  it("builds table rows with a placeholder account", () => {
    const rows = toolRows(
      [
        project({
          tools: [
            tool({
              billing: { amount: 20, cycle: "yearly", nextInvoice: "2026-01-05", payer: "me" },
            }),
            tool({ id: "free", name: "Free" }),
          ],
        }),
      ],
      "BRL",
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      account: "—",
      cycle: "yearly",
      monthly: 20 / 12,
      payer: "me",
    })

    const named = toolRows(
      [
        project({
          tools: [
            tool({
              account: "ada@test.local",
              billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
            }),
          ],
        }),
      ],
      "BRL",
    )
    expect(named[0]?.account).toBe("ada@test.local")

    const skipped = toolRows(
      [
        project({
          tools: [
            tool({
              billing: {
                amount: 9,
                cycle: "monthly",
                nextInvoice: "2026-01-05",
                payer: "me",
                currency: "USD",
              },
            }),
          ],
        }),
      ],
      "BRL",
    )
    expect(skipped).toEqual([])
  })
})

describe("profit, clients, revenue", () => {
  it("subtracts only tools the freelancer pays", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 20))
    const paid = project({
      deal: { kind: "upfront", amount: 1000 },
      tools: [
        tool({
          id: "aws",
          name: "AWS",
          billing: { amount: 300, cycle: "monthly", nextInvoice: "2026-01-05", payer: "client" },
        }),
        tool({
          id: "neon",
          name: "Neon",
          billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
        }),
      ],
    })
    const profit = profitByProject([paid], monthRange("2026-01", "2026-01"), "BRL")[0]
    expect(profit).toMatchObject({ receita: 1000, custo: 20, lucro: 980 })
    expect(profit?.margem).toBeCloseTo(0.98)

    const usdTool = project({
      deal: { kind: "upfront", amount: 1000 },
      tools: [
        tool({
          id: "usd",
          name: "USD",
          billing: {
            amount: 9,
            cycle: "monthly",
            nextInvoice: "2026-01-05",
            payer: "me",
            currency: "USD",
          },
        }),
      ],
    })
    expect(profitByProject([usdTool], monthRange("2026-01", "2026-01"), "BRL")[0]?.custo).toBe(0)
  })

  it("returns zero margin when there is no revenue", () => {
    const row = profitByProject([project()], monthRange("2026-01", "2026-01"), "BRL")[0]
    expect(row).toMatchObject({ receita: 0, margem: 0 })
  })

  it("counts unique clients by first project month", () => {
    const growth = clientGrowth(
      [
        project({ id: "a", clientId: "c1", startedAt: "2026-01-05" }),
        project({ id: "b", clientId: "c1", startedAt: "2026-02-05" }),
        project({ id: "c", clientId: "c2", startedAt: "2026-03-05" }),
      ],
      monthRange("2026-01", "2026-04"),
    )
    expect(growth.map((month) => month.clientes)).toEqual([1, 1, 2, 2])
    expect(growth.map((month) => month.novos)).toEqual([1, 0, 1, 0])
  })

  it("buckets revenue and drops invoices outside the range", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    const installment = project({
      deal: { kind: "installment", amount: 3000, installments: 3 },
    })
    const revenue = revenueByMonth([installment], monthRange("2026-01", "2026-03"), "BRL")
    expect(
      revenue.reduce((sum, month) => sum + month.recebido + month.aReceber + month.atrasado, 0),
    ).toBe(3000)
    expect(
      revenueByMonth([installment], monthRange("2026-06", "2026-07"), "BRL").every(
        (month) => month.recebido + month.aReceber + month.atrasado === 0,
      ),
    ).toBe(true)
  })

  it("counts overdue vs pending vs paid and ignores other currencies", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    const paused = project({
      status: "paused",
      deal: { kind: "installment", amount: 3000, installments: 3 },
    })
    const future = project({
      id: "p2",
      startedAt: "2026-12-01",
      deal: { kind: "upfront", amount: 500 },
    })
    const dollars = project({
      id: "p3",
      deal: { kind: "upfront", amount: 5000, currency: "USD" },
    })
    const months = monthRange("2026-01", "2026-12")
    const mixed = financeSummary([paused, future, dollars], months, "BRL")
    expect(mixed.foraDaMoeda).toBe(1)
    expect(mixed.atrasado).toBeGreaterThan(0)
    expect(mixed.recebido).toBeGreaterThan(0)
    expect(mixed.aReceber).toBe(500)
    expect(financeSummary([paused], [], "BRL")).toMatchObject({
      faturado: 0,
      margem: 0,
      projetos: 0,
      clientes: 0,
    })
  })
})

describe("summaries, ruler, DTO", () => {
  it("summarizes tool spend including free and out-of-currency tools", () => {
    const summary = toolsSummary(
      [
        project({
          tools: [
            tool({
              billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
            }),
            tool({
              id: "usd",
              name: "USD",
              billing: {
                amount: 9,
                cycle: "monthly",
                nextInvoice: "2026-01-05",
                payer: "client",
                currency: "USD",
              },
            }),
            tool({ id: "free", name: "Free" }),
          ],
        }),
      ],
      monthRange("2026-01", "2026-01"),
      "BRL",
    )
    expect(summary).toMatchObject({
      pagas: 1,
      gratis: 1,
      foraDaMoeda: 1,
      eu: 20,
      cliente: 0,
      runRate: 20,
    })
    expect(summary.maisCara?.name).toBe("AWS")
    expect(toolsSummary([project()], [], "BRL")).toMatchObject({
      runRate: 0,
      maisCara: null,
    })
  })

  it("shifts a month window backward", () => {
    expect(previousMonths(monthRange("2026-03", "2026-05"))).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
    ])
    expect(previousMonths([])).toEqual([])
  })

  it("builds payment-ruler lanes only for months with invoices", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    const lanes = paymentRulerLanes(
      [
        project({ deal: { kind: "upfront", amount: 1000 } }),
        project({ id: "free", deal: { kind: "upfront", amount: 0 } }),
      ],
      monthRange("2026-01", "2026-02"),
      "BRL",
    )
    expect(lanes).toHaveLength(1)
    expect(lanes[0]?.byMonth["2026-01"]?.[0]).toMatchObject({ amount: 1000, status: "paid" })

    const installment = paymentRulerLanes(
      [project({ deal: { kind: "installment", amount: 3000, installments: 3 } })],
      monthRange("2026-01", "2026-01"),
      "BRL",
    )
    expect(installment).toHaveLength(1)
    expect(Object.keys(installment[0]?.byMonth ?? {})).toEqual(["2026-01"])
  })

  it("offers only clients that have projects", () => {
    const options = dashboardOptions(
      [project({ clientId: "c1" })],
      [
        { id: "c1", name: "Ada" },
        { id: "c2", name: "Nobody" },
        { id: "", name: "Blank" },
      ],
    )
    expect(options.clients).toEqual([{ id: "c1", name: "Ada" }])
    expect(options.projects).toEqual([{ id: "p1", name: "Projeto", clientId: "c1" }])
  })

  it("assembles the full metrics DTO", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    const metrics = buildDashboardMetrics(
      [
        project({
          deal: { kind: "upfront", amount: 1000 },
          tools: [
            tool({
              billing: { amount: 20, cycle: "monthly", nextInvoice: "2026-01-05", payer: "me" },
            }),
          ],
        }),
        project({ id: "idle", name: "Idle", deal: { kind: "upfront", amount: 0 } }),
      ],
      emptyFilters,
      [{ id: "c1", name: "Ada" }],
    )
    expect(metrics.currency).toBe("BRL")
    expect(metrics.summary.faturado).toBe(1000)
    expect(metrics.profitByProject).toHaveLength(1)
    expect(metrics.toolRows).toHaveLength(1)
    expect(metrics.options.clients).toHaveLength(1)
  })
})
