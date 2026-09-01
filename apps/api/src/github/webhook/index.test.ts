import { describe, expect, it } from "vitest"
import { parseWorkflowRunEvent, signBody, verifySignature } from "./index.ts"

const secret = "s3cr3t"

const delivery = {
  action: "completed",
  repository: { full_name: "ada/portal", default_branch: "main" },
  workflow_run: {
    id: 42,
    name: "ci",
    run_number: 7,
    status: "completed",
    conclusion: "failure",
    event: "push",
    head_branch: "main",
    head_sha: "0123456789abcdef",
    display_title: "break the thing",
    actor: { login: "ada" },
    run_started_at: "2026-09-01T10:00:00.000Z",
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T10:02:00.000Z",
    html_url: "https://github.com/ada/portal/actions/runs/42",
  },
}

describe("verifySignature", () => {
  it("accepts a body signed with the hook secret", () => {
    const body = JSON.stringify(delivery)
    expect(verifySignature(secret, body, signBody(secret, body))).toBe(true)
  })

  it("rejects a wrong secret, a tampered body and a missing header", () => {
    const body = JSON.stringify(delivery)
    expect(verifySignature("other", body, signBody(secret, body))).toBe(false)
    expect(verifySignature(secret, `${body} `, signBody(secret, body))).toBe(false)
    expect(verifySignature(secret, body, null)).toBe(false)
    expect(verifySignature(secret, body, undefined)).toBe(false)
    expect(verifySignature(secret, body, "sha256=short")).toBe(false)
  })
})

describe("parseWorkflowRunEvent", () => {
  it("reduces a workflow_run delivery to a stream event", () => {
    expect(parseWorkflowRunEvent("workflow_run", delivery)).toEqual({
      repo: "ada/portal",
      branch: "main",
      run: expect.objectContaining({ id: 42, status: "failure", name: "ci" }),
    })
  })

  it("ignores anything that is not a usable run", () => {
    expect(parseWorkflowRunEvent("ping", delivery)).toBeNull()
    expect(parseWorkflowRunEvent(null, delivery)).toBeNull()
    expect(parseWorkflowRunEvent("workflow_run", null)).toBeNull()
    expect(parseWorkflowRunEvent("workflow_run", { repository: delivery.repository })).toBeNull()
    expect(
      parseWorkflowRunEvent("workflow_run", { workflow_run: delivery.workflow_run }),
    ).toBeNull()
    expect(
      parseWorkflowRunEvent("workflow_run", { ...delivery, repository: {} }),
    ).toBeNull()
  })
})
