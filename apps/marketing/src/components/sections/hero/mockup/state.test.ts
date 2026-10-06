import { describe, expect, it } from "vitest"
import { initialState, metrics, mockupReducer, type Project } from "./state"

describe("mockupReducer", () => {
  it("moves a project and logs the status change first in the audit", () => {
    const state = initialState()
    const next = mockupReducer(state, {
      type: "move",
      id: "pulse",
      status: "in-development",
      at: 42,
    })

    expect(next.projects.find((project) => project.id === "pulse")?.status).toBe("in-development")
    expect(next.audit[0]).toEqual({
      id: 7,
      module: "kanban",
      action: "statusChanged",
      object: "Pulse analytics",
      at: 42,
      change: { from: "queued", to: "in-development" },
    })
    expect(next.audit).toHaveLength(state.audit.length + 1)
  })

  it("ignores a move to the same status and unknown projects", () => {
    const state = initialState()
    expect(mockupReducer(state, { type: "move", id: "pulse", status: "queued", at: 0 })).toBe(state)
    expect(mockupReducer(state, { type: "move", id: "nope", status: "queued", at: 0 })).toBe(state)
  })

  it("numbers audit entries from one when the log is empty", () => {
    const state = { ...initialState(), audit: [] }
    const next = mockupReducer(state, { type: "move", id: "fern", status: "queued", at: 0 })
    expect(next.audit[0].id).toBe(1)
  })
})

describe("metrics", () => {
  it("adds up the money, the tool cost and the margin for the period", () => {
    const result = metrics(initialState().projects)
    expect(result.billed).toBe(90200)
    expect(result.received).toBe(53700)
    expect(result.receivable).toBe(33400)
    expect(result.overdue).toBe(3100)
    expect(result.toolCost).toBe(564)
    expect(result.margin).toBeCloseTo((90200 - 564) / 90200)
    expect(result.projects).toBe(6)
    expect(result.clients).toBe(5)
  })

  it("splits each month into paid, pending and overdue money", () => {
    const { revenueByMonth } = metrics(initialState().projects)
    expect(revenueByMonth[0]).toEqual({ paid: 13300, pending: 0, overdue: 0 })
    expect(revenueByMonth[3]).toEqual({ paid: 9600, pending: 0, overdue: 3100 })
    expect(revenueByMonth[5]).toEqual({ paid: 0, pending: 23900, overdue: 0 })
  })

  it("accumulates clients from the month of their first invoice", () => {
    expect(metrics(initialState().projects).clientGrowth).toEqual([3, 4, 4, 4, 4, 5])

    const [atlas] = initialState().projects
    const later: Project = {
      ...atlas,
      id: "late",
      invoices: [null, null, "paid", null, null, null],
    }
    const earlier: Project = {
      ...atlas,
      id: "early",
      invoices: [null, "paid", null, null, null, null],
    }
    expect(metrics([later, earlier]).clientGrowth).toEqual([0, 1, 1, 1, 1, 1])
  })

  it("ranks projects by profit after tool cost", () => {
    expect(metrics(initialState().projects).profits).toEqual([
      { name: "Nimbus mobile app", profit: 26886 },
      { name: "Atlas storefront", profit: 24930 },
      { name: "Harbor CRM", profit: 18450 },
      { name: "Pulse analytics", profit: 9000 },
      { name: "Fern docs site", profit: 6000 },
      { name: "Relay API", profit: 4370 },
    ])
  })

  it("reports a zero margin when nothing was billed", () => {
    expect(metrics([]).margin).toBe(0)
  })
})
