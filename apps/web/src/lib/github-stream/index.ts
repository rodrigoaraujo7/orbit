/**
 * Live GitHub Actions updates. One SSE connection per open branch view; the
 * server pushes a run whenever a webhook delivery lands or its watcher notices
 * a change, so nothing here has to poll.
 */
import { useEffect, useRef, useState } from "react"
import type { WorkflowRun } from "shared"

export type GithubRunEvent = {
  repo: string
  branch: string
  run: WorkflowRun
  source: "webhook" | "poll"
}

/**
 * `polling` means the server is checking GitHub on this branch's behalf;
 * `live` means a run arrived straight from a webhook delivery. Both update on
 * their own — the distinction is only there to explain the latency.
 */
export type StreamStatus = "connecting" | "live" | "polling" | "offline"

export const STREAM_ENDPOINT = "/api/github/stream"

export function streamUrl(repo: string, branch: string) {
  const query = new URLSearchParams({ repo, branch })
  return `${STREAM_ENDPOINT}?${query}`
}

function parseEvent<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export function useGithubStream({
  enabled,
  repo,
  branch,
  onRun,
}: {
  enabled: boolean
  repo: string
  branch: string
  onRun: (event: GithubRunEvent) => void
}) {
  const canConnect = enabled && typeof EventSource !== "undefined"
  const streamKey = `${repo}\0${branch}`
  const [connection, setConnection] = useState<{ key: string; status: StreamStatus } | null>(null)
  // Kept in a ref so a new render of the handler does not reopen the stream.
  const onRunRef = useRef(onRun)

  useEffect(() => {
    onRunRef.current = onRun
  })

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return

    const key = `${repo}\0${branch}`
    const source = new EventSource(streamUrl(repo, branch))
    const set = (status: StreamStatus) => setConnection({ key, status })

    source.addEventListener("ready", (event) => {
      const payload = parseEvent<{ polling: boolean }>((event as MessageEvent<string>).data)
      set(payload?.polling ? "polling" : "live")
    })
    source.addEventListener("run", (event) => {
      const payload = parseEvent<GithubRunEvent>((event as MessageEvent<string>).data)
      if (!payload) return
      // A webhook delivery proves the repository is wired for push updates.
      if (payload.source === "webhook") set("live")
      onRunRef.current(payload)
    })
    source.addEventListener("error", () => set("offline"))

    return () => {
      source.close()
      setConnection(null)
    }
  }, [enabled, repo, branch])

  if (!canConnect) return "offline"
  if (connection?.key !== streamKey) return "connecting"
  return connection.status
}
