/**
 * The two GitHub endpoints that are not tRPC: an SSE stream the browser keeps
 * open, and the webhook GitHub posts to. Both end at the same event bus, so a
 * run reaches the UI the moment either source hears about it.
 */
import { eq } from "drizzle-orm"
import type { Hono } from "hono"
import { streamSSE, type SSEMessage } from "hono/streaming"
import { getAuth } from "../../auth/index.ts"
import { getDb } from "../../db/client/index.ts"
import { project } from "../../db/schema/index.ts"
import { withUser } from "../../db/with-user/index.ts"
import { publish, subscribe } from "../../github/events/index.ts"
import { WEBHOOK_PATH } from "../../github/hook-url/index.ts"
import { readGithubToken, readGithubTokenByHook } from "../../github/token/index.ts"
import { watchRuns } from "../../github/watch/index.ts"
import {
  EVENT_HEADER,
  SIGNATURE_HEADER,
  parseWorkflowRunEvent,
  verifySignature,
} from "../../github/webhook/index.ts"

export const STREAM_PATH = "/api/github/stream"
const HEARTBEAT_MS = 25_000

type Writer = { writeSSE: (message: SSEMessage) => Promise<void> }
type StreamHandle = Writer & { onAbort: (callback: () => void) => void }

/** A write to a stream the client already dropped must not become an unhandled rejection. */
export async function safeWrite(stream: Writer, message: SSEMessage) {
  try {
    await stream.writeSSE(message)
  } catch {
    // the client is gone; the abort handler is about to tear the stream down
  }
}

/**
 * Body of one open stream: announce, forward every event published for the
 * user, keep the connection warm, and undo all of it when the browser leaves.
 * Resolves only on abort — that is what holds the response open.
 */
export async function runGithubStream(
  stream: StreamHandle,
  options: {
    userId: string
    repo: string
    branch: string
    token: string | null
    heartbeatMs?: number
  },
) {
  const { userId, repo, branch, token } = options
  let aborted = false
  let resume: (() => void) | null = null
  // Registered before anything else on purpose: the first write only resolves
  // once the client reads it, so a browser that leaves during the handshake
  // aborts before a later listener would exist, and the stream would hang.
  stream.onAbort(() => {
    aborted = true
    resume?.()
  })

  const release = token ? watchRuns({ userId, token, repo, branch }) : null
  const unsubscribe = subscribe(userId, (event) => {
    void safeWrite(stream, {
      event: "run",
      id: String(event.run.id),
      data: JSON.stringify(event),
    })
  })
  const heartbeat = setInterval(() => {
    void safeWrite(stream, { event: "ping", data: "" })
  }, options.heartbeatMs ?? HEARTBEAT_MS)

  await safeWrite(stream, { event: "ready", data: JSON.stringify({ polling: Boolean(token) }) })
  if (!aborted) {
    await new Promise<void>((resolve) => {
      resume = resolve
    })
  }

  clearInterval(heartbeat)
  unsubscribe()
  release?.()
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

export function mountGithub(app: Hono) {
  app.get(STREAM_PATH, async (c) => {
    const session = await getAuth().api.getSession({ headers: c.req.raw.headers })
    const userId = session?.user?.id
    if (!userId) return c.json({ error: "unauthorized" }, 401)

    const repo = c.req.query("repo") ?? ""
    const branch = c.req.query("branch") ?? ""
    // Without a repo, a branch or a token there is nothing to poll — the stream
    // still opens, because webhook deliveries need no polling to arrive.
    const stored =
      repo && branch ? await withUser(getDb(), userId, (tx) => readGithubToken(tx, userId)) : null

    return streamSSE(c, (stream) =>
      runGithubStream(stream, { userId, repo, branch, token: stored?.token ?? null }),
    )
  })

  app.post(`${WEBHOOK_PATH}/:hookId`, async (c) => {
    const body = await c.req.text()
    const db = getDb()
    const stored = await readGithubTokenByHook(db, c.req.param("hookId"))
    if (!stored) return c.json({ error: "unknown_hook" }, 404)
    if (!verifySignature(stored.hookSecret, body, c.req.header(SIGNATURE_HEADER))) {
      return c.json({ error: "bad_signature" }, 401)
    }

    const payload = parseJson(body)
    const parsed = parseWorkflowRunEvent(c.req.header(EVENT_HEADER), payload)
    if (!parsed) return c.json({ ok: true, ignored: true })

    const defaultBranch = (payload as { repository?: { default_branch?: string } }).repository
      ?.default_branch
    // Keep the cached column the projects list reads in step with the delivery.
    if (parsed.branch === defaultBranch) {
      await withUser(db, stored.userId, (tx) =>
        tx
          .update(project)
          .set({ repoWorkflow: parsed.run.status })
          .where(eq(project.repoFullName, parsed.repo)),
      )
    }

    const delivered = publish(stored.userId, { ...parsed, source: "webhook" })
    return c.json({ ok: true, delivered })
  })
}
