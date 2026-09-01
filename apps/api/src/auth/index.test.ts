import { APIError } from 'better-auth/api'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { auditLog } from '../db/schema/index.ts'
import { afterAuthHook, createAuth, getAuth, resetAuth } from './index.ts'
import { closeTestDb, insertUser, openTestDb } from '../test/harness.ts'
import { withUser } from '../db/with-user/index.ts'
import { dbHolder } from '../test/setup.ts'

describe('createAuth', () => {
  afterEach(() => {
    resetAuth()
    vi.unstubAllEnvs()
  })

  it('uses a dev secret outside production and a singleton', async () => {
    const { client } = await openTestDb()
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.BETTER_AUTH_SECRET
    const first = getAuth()
    expect(getAuth()).toBe(first)
    resetAuth()
    await closeTestDb(client)
  })

  it('requires BETTER_AUTH_SECRET in production', async () => {
    const { client } = await openTestDb()
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.BETTER_AUTH_SECRET
    expect(() => createAuth()).toThrow(/missing env BETTER_AUTH_SECRET/)
    vi.stubEnv('BETTER_AUTH_SECRET', 'prod-secret-must-be-long-enough')
    expect(createAuth()).toBeTruthy()
    resetAuth()
    await closeTestDb(client)
  })
})

describe('afterAuthHook', () => {
  afterEach(async () => {
    vi.unstubAllEnvs()
  })

  it('records login, failure, logout, password and 2FA events', async () => {
    const { db, client } = await openTestDb()
    await insertUser(client, 'user-a', 'ada@test.local')
    const headers = new Headers({ 'x-forwarded-for': '10.0.0.2', 'user-agent': 'hook' })

    await afterAuthHook({
      path: '/sign-in/email',
      headers,
      context: { newSession: { user: { id: 'user-a' } } },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      request: { headers },
      body: 'nope',
      context: { returned: new APIError('UNAUTHORIZED', { message: 'no' }) },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      body: { email: '' },
      context: { returned: new APIError('UNAUTHORIZED', { message: 'no' }) },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      body: { email: undefined },
      context: { returned: new APIError('UNAUTHORIZED', { message: 'no' }) },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      body: { email: null },
      context: { returned: new APIError('UNAUTHORIZED', { message: 'no' }) },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      body: { email: 'ghost@test.local' },
      context: { returned: new APIError('UNAUTHORIZED', { message: 'no' }) },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      headers,
      body: { email: 'ada@test.local' },
      context: { returned: new APIError('UNAUTHORIZED', { message: 'no' }) },
    })
    await afterAuthHook({
      path: '/sign-in/email',
      context: {},
    })
    await afterAuthHook({
      path: '/sign-out',
      context: {},
    })
    await afterAuthHook({
      path: '/sign-out',
      headers,
      context: {
        session: { user: { id: 'user-a' } },
        returned: new APIError('BAD_REQUEST', { message: 'no' }),
      },
    })
    await afterAuthHook({
      path: '/sign-out',
      headers,
      context: { session: { user: { id: 'user-a' } } },
    })
    await afterAuthHook({
      path: '/change-password',
      context: { session: { user: { id: 'user-a' } } },
    })
    await afterAuthHook({
      path: '/two-factor/enable',
      context: { session: { user: { id: 'user-a' } } },
    })
    await afterAuthHook({
      path: '/two-factor/disable',
      context: { session: { user: { id: 'user-a' } } },
    })
    await afterAuthHook({
      path: '/other',
      context: { session: { user: { id: 'user-a' } } },
    })

    const logs = await withUser(db, 'user-a', (tx) => tx.select().from(auditLog))
    const actions = logs.map((row) => row.action).sort()
    expect(actions).toEqual(
      [
        'security.2fa.disable',
        'security.2fa.enable',
        'security.login',
        'security.login.failed',
        'security.logout',
        'security.password.change',
      ].sort(),
    )

    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const previous = dbHolder.db
    dbHolder.db = {
      transaction: async () => {
        throw new Error('audit boom')
      },
    }
    await afterAuthHook({
      path: '/sign-in/email',
      context: { newSession: { user: { id: 'user-a' } } },
    })
    dbHolder.db = previous
    expect(error).toHaveBeenCalled()
    error.mockRestore()
    await closeTestDb(client)
  })
})
