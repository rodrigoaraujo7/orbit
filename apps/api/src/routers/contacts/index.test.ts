import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { caller, closeTestDb, insertUser, openTestDb } from '../../test/harness.ts'

let client: Awaited<ReturnType<typeof openTestDb>>['client']

beforeEach(async () => {
  ;({ client } = await openTestDb())
  await insertUser(client, 'user-a')
})

afterEach(async () => {
  await closeTestDb(client)
})

describe('contacts router', () => {
  it('creates, lists, updates and deletes contacts', async () => {
    const api = caller('user-a')
    const created = await api.contacts.create({
      name: 'Ada',
      email: 'ada@test.local',
      phone: '1199',
      company: 'Acme',
    })
    expect(created.name).toBe('Ada')
    expect((await api.contacts.list())[0]?.id).toBe(created.id)

    await api.contacts.update({
      id: created.id,
      name: 'Ada Lovelace',
      email: '',
      phone: '',
      company: '',
    })
    expect((await api.contacts.list())[0]).toMatchObject({ name: 'Ada Lovelace', email: null })

    await api.contacts.update({
      id: created.id,
      name: 'Ada Lovelace',
      email: '',
    })
    await api.contacts.update({
      id: 'missing',
      name: 'Ghost',
    })
    await api.contacts.delete({ id: created.id })
    expect(await api.contacts.list()).toEqual([])
    await api.contacts.delete({ id: created.id })
  })
})
