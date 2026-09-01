import { afterEach, describe, expect, it, vi } from 'vitest'

const { serve, mountApi, applySchema, createDb } = vi.hoisted(() => ({
  serve: vi.fn((opts: { port: number }, cb: (info: { port: number }) => void) => {
    cb({ port: opts.port })
    return { close: vi.fn() }
  }),
  mountApi: vi.fn(),
  applySchema: vi.fn().mockResolvedValue(undefined),
  createDb: vi.fn(() => ({ client: {} })),
}))

vi.mock('@hono/node-server', () => ({ serve }))
vi.mock('../mount/index.ts', () => ({ mountApi }))
vi.mock('../db/client/index.ts', () => ({ createDb, applySchema, getDb: vi.fn() }))

import { start } from './index.ts'

describe('start', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    serve.mockClear()
    mountApi.mockClear()
  })

  it('throws without DATABASE_URL', async () => {
    vi.stubEnv('DATABASE_URL', '')
    await expect(start()).rejects.toThrow(/missing env DATABASE_URL/)
  })

  it('warns without a Better Auth API key and listens', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test')
    vi.stubEnv('BETTER_AUTH_API_KEY', '')
    delete process.env.PORT
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await start()
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/BETTER_AUTH_API_KEY/))
    expect(createDb).toHaveBeenCalled()
    expect(applySchema).toHaveBeenCalled()
    expect(mountApi).toHaveBeenCalled()
    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3000 }),
      expect.any(Function),
    )
    expect(log).toHaveBeenCalledWith('api listening on 3000')
    warn.mockRestore()
    log.mockRestore()
  })

  it('honours an explicit port', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test')
    vi.stubEnv('BETTER_AUTH_API_KEY', 'key')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await start({ port: 3100 })
    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3100 }),
      expect.any(Function),
    )
  })
})
