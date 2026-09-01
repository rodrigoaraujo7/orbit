import { TRPCError } from "@trpc/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getRepo,
  githubError,
  githubFetch,
  listBranches,
  listWorkflowRuns,
  toWorkflowRun,
  verifyToken,
  type RawWorkflowRun,
} from "./index.ts"

const fetchMock = vi.fn()

function reply(status: number, body: unknown, { raw }: { raw?: string } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => raw ?? (body === undefined ? "" : JSON.stringify(body)),
  }
}

function rawRun(overrides: Partial<RawWorkflowRun> = {}): RawWorkflowRun {
  return {
    id: 42,
    name: "ci",
    run_number: 7,
    status: "completed",
    conclusion: "success",
    event: "push",
    head_branch: "main",
    head_sha: "0123456789abcdef",
    display_title: "fix the thing",
    actor: { login: "ada" },
    run_started_at: "2026-09-01T10:00:00.000Z",
    created_at: "2026-09-01T09:59:00.000Z",
    updated_at: "2026-09-01T10:02:00.000Z",
    html_url: "https://github.com/ada/portal/actions/runs/42",
    ...overrides,
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("githubError", () => {
  it("maps the statuses the user can act on", () => {
    expect(githubError(401)).toMatchObject({ code: "UNAUTHORIZED" })
    expect(githubError(403)).toMatchObject({ code: "TOO_MANY_REQUESTS" })
    expect(githubError(429)).toMatchObject({ code: "TOO_MANY_REQUESTS" })
    expect(githubError(404)).toMatchObject({ code: "NOT_FOUND" })
    expect(githubError(500)).toMatchObject({ code: "BAD_GATEWAY" })
    expect(githubError(500, "custom")).toBeInstanceOf(TRPCError)
    expect(githubError(401, "nope").message).toBe("nope")
    expect(githubError(403, "nope").message).toBe("nope")
    expect(githubError(404, "nope").message).toBe("nope")
  })
})

describe("githubFetch", () => {
  it("sends the API headers and parses the body", async () => {
    fetchMock.mockResolvedValue(reply(200, { login: "ada" }))
    const result = await githubFetch("tok", "/user")
    expect(result).toEqual({ ok: true, status: 200, body: { login: "ada" } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.github.com/user")
    expect(init.headers.authorization).toBe("Bearer tok")
    expect(init.headers["x-github-api-version"]).toBe("2022-11-28")
  })

  it("tolerates an empty or unparsable body", async () => {
    fetchMock.mockResolvedValueOnce(reply(204, undefined))
    expect(await githubFetch("tok", "/x")).toMatchObject({ body: null })
    fetchMock.mockResolvedValueOnce(reply(200, null, { raw: "<html>" }))
    expect(await githubFetch("tok", "/x")).toMatchObject({ body: null })
  })
})

describe("verifyToken", () => {
  it("returns the login when /user answers", async () => {
    fetchMock.mockResolvedValue(reply(200, { login: "ada" }))
    expect(await verifyToken("tok")).toEqual({ login: "ada" })
  })

  it("rejects a token /user refuses outright", async () => {
    fetchMock.mockResolvedValue(reply(401, { message: "Bad credentials" }))
    await expect(verifyToken("tok")).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("accepts a token denied /user but allowed elsewhere", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(403, { message: "Resource not accessible by integration" }))
      .mockResolvedValueOnce(reply(200, { resources: {} }))
    expect(await verifyToken("tok")).toEqual({ login: null })
  })

  it("rejects when the fallback also fails", async () => {
    fetchMock.mockResolvedValueOnce(reply(403, {})).mockResolvedValueOnce(reply(401, {}))
    await expect(verifyToken("tok")).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

describe("getRepo and listBranches", () => {
  it("reads the repository head", async () => {
    fetchMock.mockResolvedValue(
      reply(200, { full_name: "ada/portal", default_branch: "main", private: true }),
    )
    expect(await getRepo("tok", "ada/portal")).toEqual({
      fullName: "ada/portal",
      defaultBranch: "main",
      isPrivate: true,
    })
  })

  it("lists branch names", async () => {
    fetchMock.mockResolvedValue(reply(200, [{ name: "main" }, { name: "dev" }]))
    expect(await listBranches("tok", "ada/portal")).toEqual(["main", "dev"])
  })

  it("surfaces a missing repository", async () => {
    fetchMock.mockResolvedValue(reply(404, { message: "Not Found" }))
    await expect(getRepo("tok", "ada/gone")).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

describe("toWorkflowRun", () => {
  it("reduces a completed run", () => {
    expect(toWorkflowRun(rawRun())).toEqual({
      id: 42,
      name: "ci",
      runNumber: 7,
      status: "success",
      event: "push",
      branch: "main",
      sha: "0123456",
      title: "fix the thing",
      actor: "ada",
      startedAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:02:00.000Z",
      durationMs: 120000,
      url: "https://github.com/ada/portal/actions/runs/42",
    })
  })

  it("leaves a running job without a duration and takes the first title line", () => {
    const run = toWorkflowRun(
      rawRun({ status: "in_progress", conclusion: null, display_title: "first\nsecond" }),
    )
    expect(run).toMatchObject({ status: "running", durationMs: null, title: "first" })
  })

  it("fills in what GitHub leaves out", () => {
    const run = toWorkflowRun(
      rawRun({
        name: null,
        head_branch: null,
        display_title: null,
        actor: null,
        run_started_at: null,
      }),
    )
    expect(run).toMatchObject({ name: "", branch: "", title: "", actor: "" })
    expect(run.startedAt).toBe("2026-09-01T09:59:00.000Z")
  })
})

describe("listWorkflowRuns", () => {
  it("encodes the branch and maps every run", async () => {
    fetchMock.mockResolvedValue(reply(200, { workflow_runs: [rawRun()] }))
    const runs = await listWorkflowRuns("tok", "ada/portal", "feat/a b", 5)
    expect(runs).toHaveLength(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/ada/portal/actions/runs?branch=feat%2Fa%20b&per_page=5",
    )
  })

  it("defaults the page size and copes with a payload without runs", async () => {
    fetchMock.mockResolvedValue(reply(200, {}))
    expect(await listWorkflowRuns("tok", "ada/portal", "main")).toEqual([])
    expect(fetchMock.mock.calls[0][0]).toContain("per_page=20")
  })
})
