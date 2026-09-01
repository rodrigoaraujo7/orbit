import { afterEach, describe, expect, it, vi } from 'vitest'

const { unsafe, fakeSql, postgres, drizzle } = vi.hoisted(() => {
  const unsafe = vi.fn().mockResolvedValue(undefined)
  const fakeSql = Object.assign(vi.fn(), { unsafe })
  return {
    unsafe,
    fakeSql,
    postgres: vi.fn(() => fakeSql),
    drizzle: vi.fn((opts: { client: unknown }) => ({ db: true, client: opts.client })),
  }
})

vi.mock('postgres', () => ({ default: postgres }))
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle }))

import { applySchema, createDb, getDb, resetDb } from './index.ts'
import { postgresClientOptions } from '../postgres-options.ts'

afterEach(() => {
  resetDb()
  vi.unstubAllEnvs()
})

describe('createDb / applySchema / getDb', () => {
  it('opens postgres with DATABASE_URL and applies schema.sql', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test')
    const created = createDb()
    expect(postgres).toHaveBeenCalledWith(
      'postgres://localhost/test',
      postgresClientOptions('postgres://localhost/test'),
    )
    expect(created.client).toBe(fakeSql)
    await applySchema(created.client as never)
    expect(unsafe).toHaveBeenCalled()
    expect(String(unsafe.mock.calls[0]?.[0])).toContain('create table')
  })

  it('reuses the getDb singleton', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test')
    const first = getDb()
    const second = getDb()
    expect(first).toBe(second)
    resetDb()
    const third = getDb()
    expect(third).not.toBe(first)
  })

  it('passes a unix socket host for hostless DATABASE_URL', () => {
    vi.stubEnv('DATABASE_URL', 'postgres:///projects_manager')
    createDb()
    expect(postgres).toHaveBeenCalledWith('postgres:///projects_manager', {
      max: 10,
      host: '/var/run/postgresql',
    })
  })
})
