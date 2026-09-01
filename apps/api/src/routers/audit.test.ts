import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { auditLog } from '../db/schema.ts'
import { withUser } from '../db/with-user.ts'
import { caller, closeTestDb, insertUser, openTestDb } from '../test/harness.ts'
import { listAuditLogs } from './audit.ts'

let db: Awaited<ReturnType<typeof openTestDb>>['db']
let client: Awaited<ReturnType<typeof openTestDb>>['client']

beforeEach(async () => {
  ;({ db, client } = await openTestDb())
  await insertUser(client, 'user-a')
  await insertUser(client, 'user-b')
})

afterEach(async () => {
  await closeTestDb(client)
})

async function seed(
  userId: string,
  rows: Array<{
    id: string
    module: string
    action: string
    createdAt: string
    subjectLabel?: string
    projectId?: string
    ip?: string
    userAgent?: string
    changes?: { field: string; from: string; to: string }[]
  }>,
) {
  await withUser(db, userId, async (tx) => {
    for (const row of rows) {
      await tx.insert(auditLog).values({
        id: row.id,
        userId,
        module: row.module,
        action: row.action,
        subjectLabel: row.subjectLabel ?? null,
        projectId: row.projectId ?? null,
        ip: row.ip ?? null,
        userAgent: row.userAgent ?? null,
        changes: row.changes ?? [],
        createdAt: new Date(row.createdAt),
      })
    }
  })
}

describe('audit list', () => {
  it('keyset-paginates, filters and stays append-only', async () => {
    await seed('user-a', [
      {
        id: 'a1',
        module: 'project',
        action: 'project.create',
        createdAt: '2026-08-01T10:00:00.000Z',
        subjectLabel: 'Portal',
      },
      {
        id: 'a2',
        module: 'kanban',
        action: 'kanban.move',
        createdAt: '2026-08-02T10:00:00.000Z',
        subjectLabel: 'Portal',
        projectId: 'p1',
        ip: '203.0.113.10',
        userAgent: 'Mozilla/5.0',
      },
      {
        id: 'a3',
        module: 'settings',
        action: 'contact.create',
        createdAt: '2026-08-03T10:00:00.000Z',
        subjectLabel: 'Ada',
      },
      {
        id: 'a4',
        module: 'project',
        action: 'project.update',
        createdAt: '2026-08-04T10:00:00.000Z',
        subjectLabel: 'Portal',
        projectId: 'p1',
      },
      {
        id: 'a5',
        module: 'security',
        action: 'security.login',
        createdAt: '2026-08-05T10:00:00.000Z',
      },
      {
        id: 'a6',
        module: 'billing',
        action: 'other',
        createdAt: '2026-08-06T10:00:00.000Z',
        changes: [{ field: 'note', from: '', to: 'needle' }],
      },
    ])
    await seed('user-b', [
      {
        id: 'b1',
        module: 'project',
        action: 'project.create',
        createdAt: '2026-08-07T10:00:00.000Z',
        subjectLabel: 'Secret',
      },
    ])

    const api = caller('user-a')
    const page1 = await api.audit.list({ limit: 2 })
    expect(page1.items.map((row) => row.id)).toEqual(['a6', 'a5'])
    const page2 = await api.audit.list({ limit: 2, cursor: page1.nextCursor })
    expect(page2.items.map((row) => row.id)).toEqual(['a4', 'a3'])

    const dateAsc1 = await withUser(db, 'user-a', (tx) =>
      listAuditLogs(tx, { limit: 2, sortBy: 'createdAt', sortDir: 'asc' }),
    )
    expect(dateAsc1.items.map((row) => row.id)).toEqual(['a1', 'a2'])
    const dateAsc2 = await withUser(db, 'user-a', (tx) =>
      listAuditLogs(tx, {
        limit: 2,
        sortBy: 'createdAt',
        sortDir: 'asc',
        cursor: dateAsc1.nextCursor,
      }),
    )
    expect(dateAsc2.items.map((row) => row.id)).toEqual(['a3', 'a4'])

    const module1 = await withUser(db, 'user-a', (tx) =>
      listAuditLogs(tx, { limit: 3, sortBy: 'module', sortDir: 'asc' }),
    )
    expect(module1.items.map((row) => row.id)).toEqual(['a3', 'a2', 'a4'])
    const module2 = await withUser(db, 'user-a', (tx) =>
      listAuditLogs(tx, { limit: 3, sortBy: 'module', sortDir: 'asc', cursor: module1.nextCursor }),
    )
    expect(module2.items.map((row) => row.id).slice(0, 2)).toEqual(['a1', 'a5'])

    const moduleDesc = await withUser(db, 'user-a', (tx) =>
      listAuditLogs(tx, {
        limit: 2,
        sortBy: 'module',
        sortDir: 'desc',
        cursor: { createdAt: '2026-08-06T10:00:00.000Z', id: 'a6', module: 'billing' },
      }),
    )
    expect(moduleDesc.items.length).toBeGreaterThan(0)

    for (const module of ['settings', 'kanban', 'project', 'security'] as const) {
      await withUser(db, 'user-a', (tx) =>
        listAuditLogs(tx, {
          limit: 2,
          sortBy: 'module',
          sortDir: 'asc',
          cursor: { createdAt: '2026-08-03T10:00:00.000Z', id: 'a3', module },
        }),
      )
      await withUser(db, 'user-a', (tx) =>
        listAuditLogs(tx, {
          limit: 2,
          sortBy: 'module',
          sortDir: 'desc',
          cursor: { createdAt: '2026-08-03T10:00:00.000Z', id: 'a3', module },
        }),
      )
    }

    expect(
      (await withUser(db, 'user-a', (tx) => listAuditLogs(tx, { modules: ['kanban'] }))).items[0]
        ?.id,
    ).toBe('a2')
    expect(
      (await withUser(db, 'user-a', (tx) => listAuditLogs(tx, { search: 'Ada' }))).items[0]?.id,
    ).toBe('a3')
    expect(
      (await withUser(db, 'user-a', (tx) => listAuditLogs(tx, { search: 'needle' }))).items[0]?.id,
    ).toBe('a6')
    expect(
      (await withUser(db, 'user-a', (tx) => listAuditLogs(tx, { search: '100%_off' }))).items,
    ).toEqual([])
    expect(
      (
        await withUser(db, 'user-a', (tx) =>
          listAuditLogs(tx, { from: '2026-08-02', to: '2026-08-04' }),
        )
      ).items.map((row) => row.id),
    ).toEqual(['a4', 'a3', 'a2'])
    expect(
      (
        await withUser(db, 'user-a', (tx) =>
          listAuditLogs(tx, { from: '2026-08-02T00:00:00.000Z', to: '2026-08-04T23:59:59.000Z' }),
        )
      ).items.length,
    ).toBeGreaterThan(0)
    expect(
      (await withUser(db, 'user-a', (tx) => listAuditLogs(tx, { projectId: 'p1' }))).items,
    ).toHaveLength(2)

    const asB = await caller('user-b').audit.list({})
    expect(asB.items.map((row) => row.id)).toEqual(['b1'])

    await expect(
      withUser(db, 'user-a', async (tx) => {
        await tx.update(auditLog).set({ action: 'tampered' }).where(eq(auditLog.id, 'a1'))
      }),
    ).rejects.toThrow()
    await expect(
      withUser(db, 'user-a', async (tx) => {
        await tx.delete(auditLog).where(eq(auditLog.id, 'a1'))
      }),
    ).rejects.toThrow()
    const stillThere = await withUser(db, 'user-a', (tx) =>
      tx.execute(sql`select id from audit_log where id = 'a1'`),
    )
    const remaining = (stillThere as { rows?: unknown[] }).rows ?? (stillThere as unknown[])
    expect(Array.isArray(remaining) && remaining.length === 1).toBe(true)
  })
})
