/**
 * Polling fallback for the live stream. A GitHub webhook is instant but needs a
 * public URL, which a local install does not have; while at least one SSE
 * client is watching a branch this re-reads the runs and publishes the ones
 * that changed, so the badge still moves on its own.
 */
import { listWorkflowRuns } from "../client/index.ts"
import { publish } from "../events/index.ts"

export const WATCH_INTERVAL_MS = 10_000

type Watch = {
  refs: number
  timer: ReturnType<typeof setInterval>
  /** Last status seen per run id — the diff that decides what is worth sending. */
  seen: Map<number, string>
  primed: boolean
  busy: boolean
}

const watches = new Map<string, Watch>()

export type WatchTarget = {
  userId: string
  token: string
  repo: string
  branch: string
  intervalMs?: number
}

function keyOf(target: WatchTarget) {
  return `${target.userId}:${target.repo}:${target.branch}`
}

async function poll(key: string, target: WatchTarget) {
  const watch = watches.get(key)
  /* v8 ignore next -- the timer is cleared before the map entry is dropped */
  if (!watch || watch.busy) return
  watch.busy = true
  try {
    const runs = await listWorkflowRuns(target.token, target.repo, target.branch, 10)
    // Oldest first so a burst arrives in the order it happened.
    for (const run of [...runs].reverse()) {
      if (watch.seen.get(run.id) === run.status) continue
      watch.seen.set(run.id, run.status)
      // The first sweep only records what is already on screen.
      if (watch.primed) {
        publish(target.userId, { repo: target.repo, branch: target.branch, run, source: "poll" })
      }
    }
    watch.primed = true
  } catch {
    // A rate limit or a blip must not kill the watcher; the next tick retries.
  } finally {
    watch.busy = false
  }
}

/**
 * Starts watching, or joins the watch already running for the same user, repo
 * and branch. Returns the release function; the timer stops when the last
 * viewer lets go.
 */
export function watchRuns(target: WatchTarget) {
  const key = keyOf(target)
  const existing = watches.get(key)
  if (existing) {
    existing.refs += 1
    return () => release(key)
  }

  const interval = target.intervalMs ?? WATCH_INTERVAL_MS
  const timer = setInterval(() => void poll(key, target), interval)
  // Node should not stay alive just to poll GitHub.
  timer.unref?.()
  watches.set(key, { refs: 1, timer, seen: new Map(), primed: false, busy: false })
  void poll(key, target)
  return () => release(key)
}

function release(key: string) {
  const watch = watches.get(key)
  /* v8 ignore next -- release is returned once per watcher and called once */
  if (!watch) return
  watch.refs -= 1
  if (watch.refs > 0) return
  clearInterval(watch.timer)
  watches.delete(key)
}

export function watchCount() {
  return watches.size
}

/** Test seam: stops every watcher between suites. */
export function resetWatches() {
  for (const watch of watches.values()) clearInterval(watch.timer)
  watches.clear()
}
