import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

const handler = vi.fn(async () => new Response('auth-ok'))

vi.mock('./auth.ts', () => ({
  getAuth: () => ({ handler }),
}))

import { mountApi } from './mount.ts'

describe('mountApi', () => {
  it('forwards Better Auth and tRPC routes', async () => {
    const app = new Hono()
    mountApi(app)
    const auth = await app.request('/api/auth/ok')
    expect(handler).toHaveBeenCalled()
    expect(await auth.text()).toBe('auth-ok')

    const trpc = await app.request('/trpc/does-not-exist')
    expect(trpc.status).toBeGreaterThanOrEqual(400)
  })
})
