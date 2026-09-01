import { describe, expect, it } from "vitest"
import {
  branchWorkflowStatus,
  isRunActive,
  mergeRun,
  runWorkflowStatus,
  type WorkflowRun,
} from "./github.ts"

function run(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: 1,
    name: "ci",
    runNumber: 10,
    status: "success",
    event: "push",
    branch: "main",
    sha: "abc1234",
    title: "fix the thing",
    actor: "ada",
    startedAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:04:00Z",
    durationMs: 240000,
    url: "https://github.com/ada/portal/actions/runs/1",
    ...overrides,
  }
}

describe("runWorkflowStatus", () => {
  it("treats anything not completed as running", () => {
    expect(runWorkflowStatus("queued", null)).toBe("running")
    expect(runWorkflowStatus("in_progress", null)).toBe("running")
    expect(runWorkflowStatus("waiting", null)).toBe("running")
  })

  it("maps completed runs to the badge states", () => {
    expect(runWorkflowStatus("completed", "success")).toBe("success")
    expect(runWorkflowStatus("completed", "failure")).toBe("failure")
    expect(runWorkflowStatus("completed", "timed_out")).toBe("failure")
    expect(runWorkflowStatus("completed", "startup_failure")).toBe("failure")
    expect(runWorkflowStatus("completed", "cancelled")).toBe("none")
    expect(runWorkflowStatus("completed", "skipped")).toBe("none")
    expect(runWorkflowStatus("completed", null)).toBe("none")
  })
})

describe("isRunActive", () => {
  it("is true only while the run is moving", () => {
    expect(isRunActive({ status: "running" })).toBe(true)
    expect(isRunActive({ status: "success" })).toBe(false)
  })
})

describe("branchWorkflowStatus", () => {
  it("takes the most recent run and falls back to none", () => {
    expect(branchWorkflowStatus([{ status: "failure" }, { status: "success" }])).toBe("failure")
    expect(branchWorkflowStatus([])).toBe("none")
  })
})

describe("mergeRun", () => {
  it("replaces a known run in place", () => {
    const list = [run({ id: 2, startedAt: "2026-09-01T11:00:00Z" }), run({ id: 1 })]
    const merged = mergeRun(list, run({ id: 1, status: "failure" }))
    expect(merged).toHaveLength(2)
    expect(merged[1]).toMatchObject({ id: 1, status: "failure" })
  })

  it("adds an unknown run and keeps the newest first", () => {
    const merged = mergeRun([run({ id: 1 })], run({ id: 2, startedAt: "2026-09-01T12:00:00Z" }))
    expect(merged.map((entry) => entry.id)).toEqual([2, 1])
  })

  it("breaks a start-time tie by id", () => {
    const merged = mergeRun([run({ id: 5 })], run({ id: 9 }))
    expect(merged.map((entry) => entry.id)).toEqual([9, 5])
  })
})
