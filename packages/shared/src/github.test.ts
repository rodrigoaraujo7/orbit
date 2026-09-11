import { describe, expect, it } from "vitest"
import {
  GITHUB_REPO_PREFIX,
  branchWorkflowStatus,
  githubRepoHref,
  githubRepoUrl,
  isGithubRepoFullName,
  isGithubRepoUrl,
  isHttpsGithubRepoUrl,
  isRunActive,
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

describe("github repo URLs", () => {
  it("accepts only https://github.com/<fullName>", () => {
    expect(GITHUB_REPO_PREFIX).toBe("https://github.com/")
    expect(isGithubRepoFullName("org/app")).toBe(true)
    expect(isGithubRepoFullName("just-a-name")).toBe(false)
    expect(githubRepoUrl("org/app")).toBe("https://github.com/org/app")
    expect(isHttpsGithubRepoUrl("https://github.com/org/app")).toBe(true)
    expect(isGithubRepoUrl("org/app", "https://github.com/org/app")).toBe(true)
  })

  it("rejects javascript:, data:, http:, and mismatched hosts", () => {
    expect(isHttpsGithubRepoUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpsGithubRepoUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
    expect(isHttpsGithubRepoUrl("http://github.com/org/app")).toBe(false)
    expect(isHttpsGithubRepoUrl("https://github.com.evil.test/org/app")).toBe(false)
    expect(isHttpsGithubRepoUrl("https://github.com/org/app/tree/main")).toBe(false)
    expect(isHttpsGithubRepoUrl("https://github.com/org/app?tab=readme")).toBe(false)
    expect(isGithubRepoUrl("org/app", "https://github.com/other/repo")).toBe(false)
    expect(isGithubRepoUrl("org/app", "javascript:alert(1)")).toBe(false)
    expect(isGithubRepoUrl("just-a-name", "https://github.com/just-a-name")).toBe(false)
    expect(isHttpsGithubRepoUrl("https://github.com/just-a-name")).toBe(false)
  })

  it("never returns a javascript: href even when fullName is garbage", () => {
    expect(githubRepoHref("org/app")).toBe("https://github.com/org/app")
    expect(githubRepoHref("javascript:alert(1)")).toBeUndefined()
    expect(githubRepoHref("https://github.com/org/app")).toBeUndefined()
  })
})

describe("branchWorkflowStatus", () => {
  it("takes the most recent run and falls back to none", () => {
    expect(branchWorkflowStatus([{ status: "failure" }, { status: "success" }])).toBe("failure")
    expect(branchWorkflowStatus([])).toBe("none")
  })
})
