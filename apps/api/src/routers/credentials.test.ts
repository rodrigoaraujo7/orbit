import { randomBytes } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { project, projectTool } from '../db/schema.ts'
import { withUser } from '../db/with-user.ts'
import { caller, closeTestDb, insertUser, openTestDb } from '../test/harness.ts'
import {
  recordRevealAttempt,
  requireRevealAccess,
  revealAttemptCount,
  sealNewSecret,
} from './credentials.ts'

const master = randomBytes(32).toString('hex')

let db: Awaited<ReturnType<typeof openTestDb>>['db']
let client: Awaited<ReturnType<typeof openTestDb>>['client']

beforeEach(async () => {
  process.env.MASTER_KEY = master
  ;({ db, client } = await openTestDb())
  await insertUser(client, 'user-a')
})

afterEach(async () => {
  await closeTestDb(client)
})

describe('requireRevealAccess', () => {
  it('requires 2FA and a fresh session', () => {
    expect(() => requireRevealAccess({ twoFactorEnabled: false }, new Date())).toThrow(TRPCError)
    expect(() =>
      requireRevealAccess({ twoFactorEnabled: true }, new Date(Date.now() - 16 * 60 * 1000)),
    ).toThrow(/Reauthenticate/)
    expect(() => requireRevealAccess({ twoFactorEnabled: true }, null)).toThrow(/Reauthenticate/)
    requireRevealAccess({ twoFactorEnabled: true }, new Date())
  })
})

describe('credentials router', () => {
  it('lists, creates and reveals secrets with a durable attempt cap', async () => {
    const toolId = await withUser(db, 'user-a', async (tx) => {
      await tx.insert(project).values({
        id: 'p1',
        userId: 'user-a',
        name: 'Secret project',
        status: 'queued',
        position: 0,
        startedAt: '2026-01-01',
        dealKind: 'upfront',
        dealAmountCents: 0n,
        dealCurrency: 'BRL',
      })
      await tx.insert(projectTool).values({
        id: 't1',
        userId: 'user-a',
        projectId: 'p1',
        catalogId: 'aws',
        name: 'AWS',
        category: 'infra',
      })
      return 't1'
    })

    const api = caller('user-a')
    const created = await api.credentials.create({
      projectToolId: toolId,
      label: 'TOKEN',
      value: 'sk_live_abc',
    })
    expect((await api.credentials.list({ projectToolId: toolId }))[0]?.label).toBe('TOKEN')

    const revealed = await api.credentials.reveal({ id: created.id })
    expect(revealed.value).toBe('sk_live_abc')

    await expect(api.credentials.reveal({ id: 'missing' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      caller('user-a', { twoFactorEnabled: false }).credentials.reveal({ id: created.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    await withUser(db, 'user-a', async (tx) => {
      for (let i = 0; i < 9; i++) await recordRevealAttempt(tx, 'user-a', 'cred-1')
      expect(await revealAttemptCount(tx, 'user-a')).toBe(10)
      await recordRevealAttempt(tx, 'user-a', 'cred-1')
      expect(await revealAttemptCount(tx, 'user-a')).toBeGreaterThan(10)
    })
    await expect(api.credentials.reveal({ id: created.id })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    })

    await withUser(db, 'user-a', (tx) => sealNewSecret(tx, 'user-a', toolId, 'OTHER', 'second'))
  })
})
