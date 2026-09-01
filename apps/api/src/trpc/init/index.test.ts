import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { closeTestDb, insertUser, openTestDb } from '../../test/harness.ts'
import { asUser, auditCtx, createContext, publicProcedure, router } from './index.ts'

const getSession = vi.fn()

vi.mock('../../auth/index.ts', () => ({
  getAuth: () => ({ api: { getSession } }),
}))

describe('tRPC init', () => {
  afterEach(() => {
    getSession.mockReset()
  })

  it('resolves a session onto the context', async () => {
    const session = { user: { id: 'user-a' }, session: { createdAt: new Date() } }
    getSession.mockResolvedValue(session)
    const req = new Request('http://localhost/trpc')
    const ctx = await createContext({ req, resHeaders: new Headers() } as never)
    expect(ctx.user).toEqual(session.user)
    expect(ctx.session).toBe(session)

    getSession.mockResolvedValue(null)
    const empty = await createContext({ req, resHeaders: new Headers() } as never)
    expect(empty.user).toBeNull()
  })

  it('runs asUser against the test db and reads audit headers', async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, 'user-a')
    const rows = await asUser({ userId: 'user-a' }, async (tx) => tx.execute(sql`select 1 as n`))
    expect(rows).toBeTruthy()
    const req = new Request('http://localhost/trpc', {
      headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'vitest' },
    })
    expect(auditCtx({ userId: 'user-a', req })).toEqual({
      userId: 'user-a',
      ip: '10.0.0.1',
      userAgent: 'vitest',
    })
    const probe = router({ ping: publicProcedure.query(() => 'pong') })
    expect(await probe.createCaller({ user: null, session: null, req }).ping()).toBe('pong')
    await closeTestDb(client)
  })
})
