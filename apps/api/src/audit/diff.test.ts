import { describe, expect, it } from 'vitest'
import { diffProject, type ProjectDiffInput } from './diff.ts'

const SECRET = 'super-secret-value-must-never-leak'

function project(overrides: Partial<ProjectDiffInput> = {}): ProjectDiffInput {
  return {
    name: 'Projeto',
    clientId: 'c1',
    status: 'queued',
    startedAt: '2026-01-10',
    endedAt: null,
    deal: { kind: 'upfront', amount: 0, currency: 'BRL' },
    repo: null,
    description: '',
    comments: [],
    tools: [],
    ...overrides,
  }
}

describe('diffProject', () => {
  it('returns nothing when the snapshot is unchanged', () => {
    expect(diffProject(project(), project())).toEqual([])
  })

  it('records project fields and deal amounts', () => {
    const byName = diffProject(project(), project({ name: 'Novo' }))
    expect(byName[0]).toMatchObject({ module: 'project', action: 'project.update' })
    expect(byName[0]?.changes).toEqual([{ field: 'name', from: 'Projeto', to: 'Novo' }])

    const byDeal = diffProject(
      project({ deal: { kind: 'upfront', amount: 10 } }),
      project({ deal: { kind: 'installment', amount: 18000, installments: 3, currency: 'BRL' } }),
    )
    expect(
      byDeal[0]?.changes.some((c) => c.field === 'deal.amount' && c.to.includes('18000')),
    ).toBe(true)
    expect(byDeal[0]?.changes.some((c) => c.field === 'deal.kind')).toBe(true)
    expect(byDeal[0]?.changes.some((c) => c.field === 'deal.installments')).toBe(true)

    const noCurrency = diffProject(
      project({ deal: { kind: 'upfront', amount: 10, currency: '' } }),
      project({ deal: { kind: 'upfront', amount: 20, currency: '' } }),
    )
    expect(
      noCurrency[0]?.changes.some((c) => c.field === 'deal.amount' && String(c.to).includes('BRL')),
    ).toBe(true)

    expect(diffProject(project(), project({ repo: { fullName: 'a/b' } }))[0]?.changes).toEqual([
      { field: 'repo', from: '', to: 'a/b' },
    ])
    expect(
      diffProject(project({ endedAt: '  ' }), project({ endedAt: '2026-02-01' }))[0]?.changes,
    ).toEqual([{ field: 'endedAt', from: '', to: '2026-02-01' }])
  })

  it('classifies kanban moves, description edits and comments', () => {
    expect(diffProject(project(), project({ status: 'in-development' }))[0]).toMatchObject({
      module: 'kanban',
      action: 'kanban.move',
    })
    expect(diffProject(project(), project({ description: 'ship it' }))[0]?.action).toBe(
      'kanban.update',
    )

    const created = diffProject(
      project({ comments: 'nope' }),
      project({
        comments: [
          { id: 'c1', author: 'A', createdAt: '2026-08-20T10:00', body: 'oi' },
          { id: 'c-empty', body: 1 },
          null,
          { body: 'skip' },
          1,
        ],
      }),
    )
    expect(created[0]?.action).toBe('kanban.comment.create')
    expect(created[0]?.changes.some((c) => c.field === 'comment.created' && c.to === 'oi')).toBe(
      true,
    )
    expect(created[0]?.changes.some((c) => c.field === 'comment.created' && c.to === '')).toBe(true)

    const edited = diffProject(
      project({ comments: [{ id: 'c1', body: 'oi' }] }),
      project({ comments: [{ id: 'c1', body: 'olá' }] }),
    )
    expect(edited[0]?.action).toBe('kanban.comment.edit')

    const deleted = diffProject(
      project({ comments: [{ id: 'c1', body: 'oi' }] }),
      project({ comments: [] }),
    )
    expect(deleted[0]?.action).toBe('kanban.comment.delete')

    const mixedComments = diffProject(
      project({ comments: [{ id: 'c1', body: 'oi' }] }),
      project({
        comments: [
          { id: 'c1', body: 'olá' },
          { id: 'c2', body: 'new' },
        ],
      }),
    )
    expect(mixedComments[0]?.action).toBe('kanban.update')
  })

  it('diffs tools and never records secret values', () => {
    const addedSecret = diffProject(
      project({ tools: [{ id: 'aws', name: 'AWS', secrets: [] }] }),
      project({ tools: [{ id: 'aws', name: 'AWS', secrets: [{ key: 'NEW', value: 'sk_live' }] }] }),
    )
    expect(addedSecret[0]?.changes.some((c) => c.field.includes('NEW') && c.to === 'set')).toBe(
      true,
    )
    expect(JSON.stringify(addedSecret)).not.toContain('sk_live')

    const added = diffProject(
      project(),
      project({
        tools: [
          {
            id: 'aws',
            name: 'AWS',
            account: 'me@x',
            billing: { amount: 10, cycle: 'monthly', nextInvoice: '2026-01-01', payer: 'me' },
            secrets: [{ key: 'TOKEN', value: SECRET }],
          },
        ],
      }),
    )
    expect(added[0]?.changes.some((c) => c.field === 'tool.aws')).toBe(true)
    expect(JSON.stringify(added)).not.toContain(SECRET)

    const billing = diffProject(
      project({
        tools: [{ id: 'aws', name: 'AWS', secrets: [] }],
      }),
      project({
        tools: [
          {
            id: 'aws',
            name: 'AWS',
            account: 'acct',
            billing: {
              amount: 20,
              cycle: 'yearly',
              nextInvoice: '2026-02-01',
              payer: 'client',
              currency: 'USD',
            },
            secrets: [],
          },
        ],
      }),
    )
    expect(billing[0]?.changes.some((c) => c.field === 'tool.aws.account')).toBe(true)
    expect(
      billing[0]?.changes.some((c) => c.field === 'tool.aws.billing' && c.to.includes('USD')),
    ).toBe(true)

    const defaultBillingCurrency = diffProject(
      project({ tools: [{ id: 'aws', name: 'AWS', secrets: [] }] }),
      project({
        tools: [
          {
            id: 'aws',
            name: 'AWS',
            billing: {
              amount: 5,
              cycle: 'monthly',
              nextInvoice: '2026-01-01',
              payer: 'me',
              currency: '',
            },
            secrets: [
              { key: 'EMPTY', value: '' },
              { key: 'NEW', value: 'sk_live' },
            ],
          },
        ],
      }),
    )
    expect(
      defaultBillingCurrency[0]?.changes.some(
        (c) => c.field === 'tool.aws.billing' && c.to.includes('BRL'),
      ),
    ).toBe(true)
    expect(
      defaultBillingCurrency[0]?.changes.some((c) => c.field.includes('NEW') && c.to === 'set'),
    ).toBe(true)

    const secretPrev = project({
      tools: [{ id: 'aws', name: 'AWS', secrets: [{ key: 'TOKEN' }] }],
    })
    const secretDiff = diffProject(
      secretPrev,
      project({ tools: [{ id: 'aws', name: 'AWS', secrets: [{ key: 'TOKEN', value: SECRET }] }] }),
    )
    expect(
      secretDiff[0]?.changes.some((c) => c.field.includes('TOKEN') && c.to === 'changed'),
    ).toBe(true)
    expect(JSON.stringify(secretDiff)).not.toContain(SECRET)

    expect(
      diffProject(
        secretPrev,
        project({ tools: [{ id: 'aws', name: 'AWS', secrets: [{ key: 'TOKEN', value: '' }] }] }),
      ),
    ).toEqual([])

    const removedSecret = diffProject(
      secretPrev,
      project({ tools: [{ id: 'aws', name: 'AWS', secrets: [] }] }),
    )
    expect(removedSecret[0]?.changes.some((c) => c.field.includes('TOKEN') && c.to === '')).toBe(
      true,
    )

    const removedTool = diffProject(
      project({ tools: [{ id: 'aws', name: 'AWS', secrets: [] }] }),
      project(),
    )
    expect(removedTool[0]?.changes).toEqual([{ field: 'tool.aws', from: 'AWS', to: '' }])
  })
})
