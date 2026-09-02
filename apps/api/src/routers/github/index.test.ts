import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { WorkflowRun } from "shared"

const { getRepo, listBranches, listWorkflowRuns, verifyToken } = vi.hoisted(() => ({
  getRepo: vi.fn(),
  listBranches: vi.fn(),
  listWorkflowRuns: vi.fn(),
  verifyToken: vi.fn(),
}))

vi.mock("../../github/client/index.ts", () => ({
  getRepo,
  listBranches,
  listWorkflowRuns,
  verifyToken,
}))

import { auditLog, project } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import { saveGithubToken } from "../../github/token/index.ts"
import { caller, closeTestDb, insertUser, openTestDb } from "../../test/harness.ts"

const master = randomBytes(32).toString("hex")

let db: Awaited<ReturnType<typeof openTestDb>>["db"]
let client: Awaited<ReturnType<typeof openTestDb>>["client"]

function run(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
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

async function insertProject(id: string, userId: string, repoFullName: string | null) {
  await withUser(db, userId, (tx) =>
    tx.insert(project).values({
      id,
      userId,
      name: `Project ${id}`,
      status: "queued",
      startedAt: "2026-01-01",
      dealKind: "upfront",
      repoFullName,
      repoUrl: repoFullName ? `https://github.com/${repoFullName}` : null,
      repoWorkflow: "none",
    }),
  )
}

async function connect(userId = "user-a") {
  await withUser(db, userId, (tx) => saveGithubToken(tx, userId, "ghp_secret", "ada"))
}

beforeEach(async () => {
  process.env.MASTER_KEY = master
  ;({ db, client } = await openTestDb())
  await insertUser(client, "user-a")
  await insertUser(client, "user-b")
  getRepo.mockReset()
  listBranches.mockReset()
  listWorkflowRuns.mockReset()
  verifyToken.mockReset()
  getRepo.mockResolvedValue({ fullName: "ada/portal", defaultBranch: "main", isPrivate: true })
  listBranches.mockResolvedValue(["main", "dev"])
  listWorkflowRuns.mockResolvedValue([run()])
  verifyToken.mockResolvedValue({ login: "ada" })
})

afterEach(async () => {
  await closeTestDb(client)
})

describe("github.status", () => {
  it("reports a disconnected account", async () => {
    expect(await caller("user-a").github.status()).toEqual({
      connected: false,
      login: null,
    })
  })

  it("returns the login once connected", async () => {
    await connect()
    expect(await caller("user-a").github.status()).toEqual({
      connected: true,
      login: "ada",
    })
  })

  it("refuses an anonymous caller", async () => {
    await expect(caller(null).github.status()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

describe("github.connect", () => {
  it("verifies, stores and audits the token", async () => {
    const result = await caller("user-a").github.connect({ token: "ghp_secret" })
    expect(verifyToken).toHaveBeenCalledWith("ghp_secret")
    expect(result).toMatchObject({ login: "ada" })

    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, "github.connect"))
    expect(entry).toMatchObject({ module: "settings", subjectLabel: "ada" })

    const status = await caller("user-a").github.status()
    expect(status).toMatchObject({ connected: true, login: "ada" })
  })

  it("stores a token GitHub would not name", async () => {
    verifyToken.mockResolvedValue({ login: null })
    expect(await caller("user-a").github.connect({ token: "ghs_install" })).toMatchObject({
      login: null,
    })
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, "github.connect"))
    expect(entry.subjectLabel).toBe("github")
  })

  it("rejects an empty token before calling GitHub", async () => {
    await expect(caller("user-a").github.connect({ token: "  " })).rejects.toThrow(
      /Enter the GitHub token/,
    )
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it("surfaces a token GitHub rejects", async () => {
    verifyToken.mockRejectedValue(new Error("GitHub token is invalid"))
    await expect(caller("user-a").github.connect({ token: "bad" })).rejects.toThrow(/invalid/)
  })
})

describe("github.disconnect", () => {
  it("drops the token and audits it", async () => {
    await connect()
    expect(await caller("user-a").github.disconnect()).toEqual({ ok: true })
    expect(await caller("user-a").github.status()).toMatchObject({ connected: false })

    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, "github.disconnect"))
    expect(entry).toMatchObject({ module: "settings" })
  })
})

describe("github.repo", () => {
  it("returns the default branch and the branch list", async () => {
    await connect()
    await insertProject("p1", "user-a", "ada/portal")

    expect(await caller("user-a").github.repo({ projectId: "p1" })).toEqual({
      fullName: "ada/portal",
      defaultBranch: "main",
      isPrivate: true,
      branches: ["main", "dev"],
    })
  })

  it("keeps the default branch even when GitHub omits it", async () => {
    await connect()
    await insertProject("p1", "user-a", "ada/portal")
    listBranches.mockResolvedValue(["dev"])

    const repo = await caller("user-a").github.repo({ projectId: "p1" })
    expect(repo.branches).toEqual(["main", "dev"])
  })

  it("asks for a connection first", async () => {
    await insertProject("p1", "user-a", "ada/portal")
    await expect(caller("user-a").github.repo({ projectId: "p1" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    })
  })

  it("rejects a project that is missing or has no repository", async () => {
    await connect()
    await insertProject("p2", "user-a", null)

    await expect(caller("user-a").github.repo({ projectId: "nope" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await expect(caller("user-a").github.repo({ projectId: "p2" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    })
  })

  it("cannot read another user's project", async () => {
    await connect("user-b")
    await insertProject("p1", "user-a", "ada/portal")
    await expect(caller("user-b").github.repo({ projectId: "p1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})

describe("github.runs", () => {
  it("reads the default branch and refreshes the cached status", async () => {
    await connect()
    await insertProject("p1", "user-a", "ada/portal")
    listWorkflowRuns.mockResolvedValue([run({ status: "failure" }), run({ id: 2 })])

    const result = await caller("user-a").github.runs({ projectId: "p1" })
    expect(result).toMatchObject({
      branch: "main",
      defaultBranch: "main",
      isDefaultBranch: true,
      workflow: "failure",
    })
    expect(result.runs).toHaveLength(2)
    expect(listWorkflowRuns).toHaveBeenCalledWith("ghp_secret", "ada/portal", "main", 20)

    const [row] = await db.select().from(project).where(eq(project.id, "p1"))
    expect(row.repoWorkflow).toBe("failure")
  })

  it("leaves the cached status alone for another branch", async () => {
    await connect()
    await insertProject("p1", "user-a", "ada/portal")
    listWorkflowRuns.mockResolvedValue([run({ branch: "dev", status: "running" })])

    const result = await caller("user-a").github.runs({
      projectId: "p1",
      branch: "dev",
      limit: 5,
    })
    expect(result).toMatchObject({ branch: "dev", isDefaultBranch: false, workflow: "running" })
    expect(listWorkflowRuns).toHaveBeenCalledWith("ghp_secret", "ada/portal", "dev", 5)

    const [row] = await db.select().from(project).where(eq(project.id, "p1"))
    expect(row.repoWorkflow).toBe("none")
  })

  it("caches none when the default branch has never run", async () => {
    await connect()
    await insertProject("p1", "user-a", "ada/portal")
    await withUser(db, "user-a", (tx) =>
      tx.update(project).set({ repoWorkflow: "success" }).where(eq(project.id, "p1")),
    )
    listWorkflowRuns.mockResolvedValue([])

    expect(await caller("user-a").github.runs({ projectId: "p1" })).toMatchObject({
      workflow: "none",
      runs: [],
    })
    const [row] = await db.select().from(project).where(eq(project.id, "p1"))
    expect(row.repoWorkflow).toBe("none")
  })

  it("asks for a connection first", async () => {
    await insertProject("p1", "user-a", "ada/portal")
    await expect(caller("user-a").github.runs({ projectId: "p1" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    })
  })
})
