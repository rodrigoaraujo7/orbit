/**
 * In-process fan-out from the two run sources (GitHub webhook deliveries and
 * the polling watcher) to the SSE streams a user has open. Single-process by
 * design; a multi-instance deploy would swap this for Postgres LISTEN/NOTIFY.
 */
import type { WorkflowRun } from "shared"

export type GithubRunEvent = {
  repo: string
  branch: string
  run: WorkflowRun
  /** Where the update came from, so the UI can tell live from polled. */
  source: "webhook" | "poll"
}

type Listener = (event: GithubRunEvent) => void

const listeners = new Map<string, Set<Listener>>()

export function subscribe(userId: string, listener: Listener) {
  let group = listeners.get(userId)
  if (!group) {
    group = new Set()
    listeners.set(userId, group)
  }
  const current = group
  current.add(listener)
  return () => {
    current.delete(listener)
    if (current.size === 0) listeners.delete(userId)
  }
}

/** Returns how many streams received the event — 0 when nobody is watching. */
export function publish(userId: string, event: GithubRunEvent) {
  const group = listeners.get(userId)
  if (!group) return 0
  for (const listener of [...group]) listener(event)
  return group.size
}

export function subscriberCount(userId: string) {
  return listeners.get(userId)?.size ?? 0
}

/** Test seam: drops every subscription so one suite cannot leak into the next. */
export function resetSubscribers() {
  listeners.clear()
}
