import type { WorkflowStatus } from "./domain.ts"

/** `workflow_run.conclusion` values that read as a red build. */
const FAILED_CONCLUSIONS = ["failure", "timed_out", "startup_failure"]

/**
 * Collapses the GitHub pair (`status`, `conclusion`) into the four states the
 * UI already has styles for. Anything neither green nor red — cancelled,
 * skipped, neutral, action_required — lands on "none" rather than inventing a
 * fifth badge.
 */
export function runWorkflowStatus(status: string, conclusion: string | null): WorkflowStatus {
  if (status !== "completed") return "running"
  if (conclusion === "success") return "success"
  if (conclusion !== null && FAILED_CONCLUSIONS.includes(conclusion)) return "failure"
  return "none"
}

/** One GitHub Actions run, already reduced to what the table renders. */
export type WorkflowRun = {
  id: number
  name: string
  runNumber: number
  status: WorkflowStatus
  event: string
  branch: string
  sha: string
  title: string
  actor: string
  startedAt: string
  updatedAt: string
  durationMs: number | null
  url: string
}

/** A run still moving — what the live stream and the spinning badge care about. */
export function isRunActive(run: Pick<WorkflowRun, "status">) {
  return run.status === "running"
}

/** Status of a branch as a whole: the most recent run wins. */
export function branchWorkflowStatus(runs: Pick<WorkflowRun, "status">[]): WorkflowStatus {
  return runs[0]?.status ?? "none"
}

/**
 * Merges a run pushed by the live stream into the list already on screen,
 * replacing it when the id is known and adding it otherwise. Ordered by start
 * time like the REST list — run numbers restart per workflow, so they cannot
 * order a list that mixes workflows.
 */
export function mergeRun(runs: WorkflowRun[], incoming: WorkflowRun): WorkflowRun[] {
  const known = runs.some((run) => run.id === incoming.id)
  const next = known
    ? runs.map((run) => (run.id === incoming.id ? incoming : run))
    : [incoming, ...runs]
  return next.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id - a.id)
}
