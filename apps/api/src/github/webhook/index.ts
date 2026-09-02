/** GitHub `workflow_run` webhook: signature check and payload narrowing. */
import { createHmac, timingSafeEqual } from "node:crypto"
import { toWorkflowRun, type RawWorkflowRun } from "../client/index.ts"
import type { GithubRunEvent } from "../events/index.ts"

export const SIGNATURE_HEADER = "x-hub-signature-256"
export const EVENT_HEADER = "x-github-event"

export function signBody(secret: string, body: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
}

/**
 * Constant-time compare of the delivery signature. The hook id in the URL is
 * only a lookup key — this is what actually authenticates the request.
 */
export function verifySignature(secret: string, body: string, header: string | null | undefined) {
  if (!header) return false
  const expected = Buffer.from(signBody(secret, body), "utf8")
  const received = Buffer.from(header, "utf8")
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

type WorkflowRunPayload = {
  action?: string
  workflow_run?: RawWorkflowRun
  repository?: { full_name?: string }
}

/**
 * Turns a delivery into a stream event, or null when it is not a usable
 * `workflow_run` (ping, another event type, or a payload missing the pieces
 * the table needs).
 */
export function parseWorkflowRunEvent(
  event: string | null | undefined,
  payload: unknown,
): Omit<GithubRunEvent, "source"> | null {
  if (event !== "workflow_run") return null
  const body = payload as WorkflowRunPayload | null
  const raw = body?.workflow_run
  const repo = body?.repository?.full_name
  if (!raw || !repo) return null
  const run = toWorkflowRun(raw)
  return { repo, branch: run.branch, run }
}
