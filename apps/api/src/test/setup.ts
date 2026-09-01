import { vi } from 'vitest'

export const dbHolder: { db: unknown } = { db: null }

vi.mock('../db/client/index.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/client/index.ts')>()
  return {
    ...actual,
    getDb: () => {
      if (dbHolder.db) return dbHolder.db
      return actual.getDb()
    },
  }
})
