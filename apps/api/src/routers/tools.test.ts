import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { caller, closeTestDb, insertUser, openTestDb } from '../test/harness.ts'

let client: Awaited<ReturnType<typeof openTestDb>>['client']

beforeEach(async () => {
  ;({ client } = await openTestDb())
  await insertUser(client, 'user-a')
})

afterEach(async () => {
  await closeTestDb(client)
})

describe('tools router', () => {
  it('creates, lists, updates and deletes custom tools', async () => {
    const api = caller('user-a')
    const created = await api.tools.createCustom({ name: 'Acme CI', category: 'deploy' })
    expect((await api.tools.listCustom())[0]?.id).toBe(created.id)

    await api.tools.updateCustom({ id: created.id, name: 'Acme CD', category: 'other' })
    expect((await api.tools.listCustom())[0]).toMatchObject({ name: 'Acme CD', category: 'other' })
    await api.tools.updateCustom({ id: created.id, name: 'Acme CD', category: 'other' })
    await api.tools.updateCustom({ id: 'missing', name: 'Ghost', category: 'other' })
    await api.tools.deleteCustom({ id: created.id })
    expect(await api.tools.listCustom()).toEqual([])
    await api.tools.deleteCustom({ id: created.id })
  })
})
