/** Thin GitHub REST client: only the five calls this app makes, no SDK. */
import { TRPCError } from "@trpc/server"
import { runWorkflowStatus, type WorkflowRun } from "shared"

const API_BASE = "https://api.github.com"
const API_VERSION = "2022-11-28"
const USER_AGENT = "projects-manager"

/** GitHub `workflow_run`, narrowed to the fields the table shows. */
export type RawWorkflowRun = {
  id: number
  name?: string | null
  run_number: number
  status: string
  conclusion: string | null
  event: string
  head_branch: string | null
  head_sha: string
  display_title?: string | null
  actor?: { login: string } | null
  run_started_at?: string | null
  created_at: string
  updated_at: string
  html_url: string
}

type FetchResult = { ok: boolean; status: number; body: unknown }

/**
 * GitHub failures the user can act on get their own code; everything else is
 * upstream noise and surfaces as a bad gateway.
 */
export function githubError(status: number, message?: string) {
  if (status === 401) {
    return new TRPCError({ code: "UNAUTHORIZED", message: message ?? "GitHub token is invalid" })
  }
  if (status === 403 || status === 429) {
    return new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: message ?? "GitHub rate limit reached",
    })
  }
  if (status === 404) {
    return new TRPCError({ code: "NOT_FOUND", message: message ?? "Repository not found" })
  }
  return new TRPCError({ code: "BAD_GATEWAY", message: message ?? "GitHub is unavailable" })
}

/** Raw call: never throws on a GitHub status, the callers decide what a 403 means. */
export async function githubFetch(token: string, path: string): Promise<FetchResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": API_VERSION,
      "user-agent": USER_AGENT,
    },
  })
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  return { ok: response.ok, status: response.status, body }
}

async function githubGet(token: string, path: string): Promise<unknown> {
  const result = await githubFetch(token, path)
  if (!result.ok) throw githubError(result.status)
  return result.body
}

/**
 * Confirms the token works and resolves the account name when it can.
 * Installation and some fine-grained tokens are denied `/user` yet still read
 * repositories, so a 403 there falls back to `/rate_limit` — the cheapest call
 * that any valid token can make — and the connection is stored without a login.
 */
export async function verifyToken(token: string): Promise<{ login: string | null }> {
  const viewer = await githubFetch(token, "/user")
  if (viewer.ok) return { login: String((viewer.body as { login: string }).login) }
  if (viewer.status !== 403) throw githubError(viewer.status)

  const limit = await githubFetch(token, "/rate_limit")
  if (!limit.ok) throw githubError(limit.status)
  return { login: null }
}

export async function getRepo(token: string, fullName: string) {
  const body = (await githubGet(token, `/repos/${fullName}`)) as {
    full_name: string
    default_branch: string
    private: boolean
  }
  return {
    fullName: body.full_name,
    defaultBranch: body.default_branch,
    isPrivate: body.private,
  }
}

export async function listBranches(token: string, fullName: string) {
  const body = (await githubGet(token, `/repos/${fullName}/branches?per_page=100`)) as {
    name: string
  }[]
  return body.map((branch) => branch.name)
}

export function toWorkflowRun(raw: RawWorkflowRun): WorkflowRun {
  const startedAt = raw.run_started_at ?? raw.created_at
  const status = runWorkflowStatus(raw.status, raw.conclusion)
  return {
    id: raw.id,
    name: raw.name ?? "",
    runNumber: raw.run_number,
    status,
    event: raw.event,
    branch: raw.head_branch ?? "",
    sha: raw.head_sha.slice(0, 7),
    title: (raw.display_title ?? "").split("\n")[0],
    actor: raw.actor?.login ?? "",
    startedAt,
    updatedAt: raw.updated_at,
    // A run still going has no duration yet — the UI counts from startedAt.
    durationMs:
      status === "running" ? null : new Date(raw.updated_at).getTime() - new Date(startedAt).getTime(),
    url: raw.html_url,
  }
}

export async function listWorkflowRuns(
  token: string,
  fullName: string,
  branch: string,
  perPage = 20,
) {
  const query = `branch=${encodeURIComponent(branch)}&per_page=${perPage}`
  const body = (await githubGet(token, `/repos/${fullName}/actions/runs?${query}`)) as {
    workflow_runs?: RawWorkflowRun[]
  }
  return (body.workflow_runs ?? []).map(toWorkflowRun)
}
