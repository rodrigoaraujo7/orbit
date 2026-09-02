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

/** A run still moving — what the spinning badge cares about. */
export function isRunActive(run: Pick<WorkflowRun, "status">) {
  return run.status === "running"
}

/** Status of a branch as a whole: the most recent run wins. */
export function branchWorkflowStatus(runs: Pick<WorkflowRun, "status">[]): WorkflowStatus {
  return runs[0]?.status ?? "none"
}
