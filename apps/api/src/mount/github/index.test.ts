import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { WorkflowRun } from "shared"

const { getSession, listWorkflowRuns } = vi.hoisted(() => ({
  getSession: vi.fn(),
  listWorkflowRuns: vi.fn(),
}))

vi.mock("../../auth/index.ts", () => ({ getAuth: () => ({ api: { getSession } }) }))
vi.mock("../../github/client/index.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../github/client/index.ts")>()),
  listWorkflowRuns,
}))

import { project } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import { publish, resetSubscribers, subscriberCount } from "../../github/events/index.ts"
import { WEBHOOK_PATH } from "../../github/hook-url/index.ts"
import { saveGithubToken } from "../../github/token/index.ts"
import { resetWatches, watchCount } from "../../github/watch/index.ts"
import { signBody } from "../../github/webhook/index.ts"
import { closeTestDb, insertUser, openTestDb } from "../../test/harness.ts"
import { STREAM_PATH, mountGithub, runGithubStream, safeWrite } from "./index.ts"

const master = randomBytes(32).toString("hex")

let db: Awaited<ReturnType<typeof openTestDb>>["db"]
let client: Awaited<ReturnType<typeof openTestDb>>["client"]
let app: Hono

function workflowRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: 1,
    name: "ci",
    runNumber: 1,
    status: "success",
    event: "push",
    branch: "main",
    sha: "abc1234",
    title: "ship it",
    actor: "ada",
    startedAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:02:00.000Z",
    durationMs: 120000,
    url: "https://github.com/ada/portal/actions/runs/1",
    ...overrides,
  }
}

/** A stand-in for Hono's SSE stream: records writes, exposes the abort hook. */
function fakeStream() {
  const written: { event?: string; data: string }[] = []
  const listeners: (() => void)[] = []
  return {
    written,
    abort: () => listeners.forEach((listener) => listener()),
    writeSSE: vi.fn(async (message: { event?: string; data: string }) => {
      written.push(message)
    }),
    onAbort: (callback: () => void) => {
      listeners.push(callback)
    },
  }
}

function delivery(overrides: Record<string, unknown> = {}) {
  return {
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
      display_title: "break it",
      actor: { login: "ada" },
      run_started_at: "2026-09-01T10:00:00.000Z",
      created_at: "2026-09-01T10:00:00.000Z",
      updated_at: "2026-09-01T10:02:00.000Z",
      html_url: "https://github.com/ada/portal/actions/runs/42",
    },
    ...overrides,
  }
}

async function post(hookId: string, secret: string, body: string, event = "workflow_run") {
  return app.request(`${WEBHOOK_PATH}/${hookId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": signBody(secret, body),
    },
    body,
  })
}

async function connect(userId = "user-a") {
  return withUser(db, userId, (tx) => saveGithubToken(tx, userId, "ghp_secret", "ada"))
}

async function insertProject(id: string, userId: string, repoFullName: string) {
  await withUser(db, userId, (tx) =>
    tx.insert(project).values({
      id,
      userId,
      name: `Project ${id}`,
      status: "queued",
      startedAt: "2026-01-01",
      dealKind: "upfront",
      repoFullName,
      repoUrl: `https://github.com/${repoFullName}`,
      repoWorkflow: "none",
    }),
  )
}

beforeEach(async () => {
  process.env.MASTER_KEY = master
  ;({ db, client } = await openTestDb())
  await insertUser(client, "user-a")
  getSession.mockReset()
  getSession.mockResolvedValue({ user: { id: "user-a" } })
  listWorkflowRuns.mockReset()
  listWorkflowRuns.mockResolvedValue([])
  app = new Hono()
  mountGithub(app)
})

afterEach(async () => {
  resetWatches()
  resetSubscribers()
  await closeTestDb(client)
})

describe("safeWrite", () => {
  it("swallows a write to a stream that is already gone", async () => {
    const stream = { writeSSE: vi.fn().mockRejectedValue(new Error("closed")) }
    await expect(safeWrite(stream, { data: "x" })).resolves.toBeUndefined()
  })
})

describe("runGithubStream", () => {
  it("announces itself, forwards published runs and cleans up on abort", async () => {
    await connect()
    const stream = fakeStream()
    const finished = runGithubStream(stream, {
      userId: "user-a",
      repo: "ada/portal",
      branch: "main",
      token: "ghp_secret",
    })
    await vi.waitFor(() => expect(stream.written).toHaveLength(1))

    expect(stream.written[0]).toMatchObject({ event: "ready", data: '{"polling":true}' })
    expect(watchCount()).toBe(1)
    expect(subscriberCount("user-a")).toBe(1)

    publish("user-a", {
      repo: "ada/portal",
      branch: "main",
      run: workflowRun({ id: 9, status: "running" }),
      source: "webhook",
    })
    await vi.waitFor(() => expect(stream.written).toHaveLength(2))
    expect(stream.written[1]).toMatchObject({ event: "run", id: "9" })
    expect(JSON.parse(stream.written[1].data)).toMatchObject({
      source: "webhook",
      run: { id: 9, status: "running" },
    })

    stream.abort()
    await finished
    expect(watchCount()).toBe(0)
    expect(subscriberCount("user-a")).toBe(0)
  })

  it("opens without a poller when there is no token", async () => {
    const stream = fakeStream()
    const finished = runGithubStream(stream, {
      userId: "user-a",
      repo: "ada/portal",
      branch: "main",
      token: null,
    })
    await vi.waitFor(() => expect(stream.written).toHaveLength(1))
    expect(stream.written[0]).toMatchObject({ data: '{"polling":false}' })
    expect(watchCount()).toBe(0)

    stream.abort()
    await finished
  })

  it("does not hang when the client leaves during the handshake", async () => {
    const stream = fakeStream()
    stream.writeSSE.mockImplementation(async () => {
      // Hono only resolves the first write once the client reads it, so an
      // abort can land before the write returns.
      stream.abort()
    })

    await expect(
      runGithubStream(stream, {
        userId: "user-a",
        repo: "ada/portal",
        branch: "main",
        token: null,
      }),
    ).resolves.toBeUndefined()
    expect(subscriberCount("user-a")).toBe(0)
  })

  it("keeps the connection warm with a heartbeat", async () => {
    vi.useFakeTimers()
    try {
      const stream = fakeStream()
      const finished = runGithubStream(stream, {
        userId: "user-a",
        repo: "",
        branch: "",
        token: null,
        heartbeatMs: 1000,
      })
      await vi.advanceTimersByTimeAsync(2500)
      expect(stream.written.filter((message) => message.event === "ping")).toHaveLength(2)

      stream.abort()
      await finished
      await vi.advanceTimersByTimeAsync(2000)
      expect(stream.written.filter((message) => message.event === "ping")).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("GET /api/github/stream", () => {
  it("refuses a request without a session", async () => {
    getSession.mockResolvedValue(null)
    const response = await app.request(STREAM_PATH)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "unauthorized" })
  })

  it("streams to a signed-in user and stops when the client leaves", async () => {
    await connect()
    const response = await app.request(`${STREAM_PATH}?repo=ada/portal&branch=main`)
    expect(response.headers.get("content-type")).toContain("text/event-stream")

    const reader = response.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    expect(first).toContain("event: ready")
    expect(first).toContain('{"polling":true}')
    await vi.waitFor(() => expect(subscriberCount("user-a")).toBe(1))

    await reader.cancel()
    await vi.waitFor(() => expect(subscriberCount("user-a")).toBe(0))
  })

  it("opens a webhook-only stream when no repository is given", async () => {
    await connect()
    const response = await app.request(STREAM_PATH)
    const reader = response.body!.getReader()
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('{"polling":false}')
    await reader.cancel()
  })
})

describe("POST /api/github/webhook/:hookId", () => {
  it("rejects an unknown hook", async () => {
    const response = await post("nope", "secret", "{}")
    expect(response.status).toBe(404)
  })

  it("rejects a delivery signed with the wrong secret", async () => {
    const { hookId } = await connect()
    const response = await post(hookId, "wrong-secret", JSON.stringify(delivery()))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "bad_signature" })
  })

  it("ignores a ping and an unreadable body", async () => {
    const { hookId, hookSecret } = await connect()
    expect(await (await post(hookId, hookSecret, "{}", "ping")).json()).toEqual({
      ok: true,
      ignored: true,
    })
    expect(await (await post(hookId, hookSecret, "not json")).json()).toEqual({
      ok: true,
      ignored: true,
    })
  })

  it("publishes a run and refreshes the cached status of the default branch", async () => {
    const { hookId, hookSecret } = await connect()
    await insertProject("p1", "user-a", "ada/portal")
    const stream = fakeStream()
    const finished = runGithubStream(stream, {
      userId: "user-a",
      repo: "ada/portal",
      branch: "main",
      token: null,
    })
    await vi.waitFor(() => expect(subscriberCount("user-a")).toBe(1))

    const response = await post(hookId, hookSecret, JSON.stringify(delivery()))
    expect(await response.json()).toEqual({ ok: true, delivered: 1 })

    const [row] = await db.select().from(project).where(eq(project.id, "p1"))
    expect(row.repoWorkflow).toBe("failure")

    await vi.waitFor(() => expect(stream.written).toHaveLength(2))
    expect(JSON.parse(stream.written[1].data)).toMatchObject({
      repo: "ada/portal",
      source: "webhook",
      run: { id: 42, status: "failure" },
    })

    stream.abort()
    await finished
  })

  it("leaves the cached status alone for a side branch", async () => {
    const { hookId, hookSecret } = await connect()
    await insertProject("p1", "user-a", "ada/portal")
    const body = JSON.stringify(
      delivery({
        workflow_run: { ...delivery().workflow_run, head_branch: "dev" },
      }),
    )

    expect(await (await post(hookId, hookSecret, body)).json()).toEqual({ ok: true, delivered: 0 })
    const [row] = await db.select().from(project).where(eq(project.id, "p1"))
    expect(row.repoWorkflow).toBe("none")
  })
})
