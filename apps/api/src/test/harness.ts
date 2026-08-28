import { createTestDb, insertUser } from "../db/test-db.ts"
import { appRouter } from "../trpc/router.ts"
import { dbHolder } from "./setup.ts"

export async function openTestDb() {
  const { db, client } = await createTestDb()
  dbHolder.db = db
  return { db, client }
}

export async function closeTestDb(client: { close: () => Promise<void> | void }) {
  dbHolder.db = null
  await client.close()
}

export function makeRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/trpc", { headers })
}

export function caller(
  userId: string | null,
  options?: {
    twoFactorEnabled?: boolean
    sessionCreatedAt?: Date
    headers?: Record<string, string>
  },
) {
  const req = makeRequest({
    "x-forwarded-for": "203.0.113.9",
    "user-agent": "vitest",
    ...options?.headers,
  })
  if (!userId) {
    return appRouter.createCaller({ user: null, session: null, req })
  }
  const user = {
    id: userId,
    twoFactorEnabled: options?.twoFactorEnabled ?? true,
  }
  return appRouter.createCaller({
    user,
    session: {
      user,
      session: { createdAt: options?.sessionCreatedAt ?? new Date() },
    },
    req,
  } as never)
}

export { insertUser }
