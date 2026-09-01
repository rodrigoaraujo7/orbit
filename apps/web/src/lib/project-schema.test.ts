import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n/index.ts'
import {
  emptyProjectForm,
  emptyToolForm,
  fromProject,
  hasPositiveAmount,
  parseAmount,
  projectSchema,
  toProject,
  type ProjectFormValues,
  type ToolFormValues,
} from './project-schema.ts'

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR')
})

function form(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return { ...emptyProjectForm, name: 'Project X', clientId: 'contact-x', ...overrides }
}

function tool(overrides: Partial<ToolFormValues> = {}): ToolFormValues {
  return { ...emptyToolForm, toolId: 'aws', ...overrides }
}

function errorPaths(values: ProjectFormValues) {
  const result = projectSchema().safeParse(values)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('projectSchema', () => {
  it('validates contact, deal, tools and repo rules', () => {
    expect(errorPaths(form({ name: 'A', clientId: '' }))).toEqual(['name', 'clientId'])
    expect(errorPaths(form({ isNewContact: true, clientId: '' }))).toEqual([
      'newContactName',
      'newContactPhone',
      'newContactCompany',
    ])
    expect(
      errorPaths(
        form({
          isNewContact: true,
          clientId: '',
          newContactName: 'Marcelo Tavares',
          newContactPhone: '(11) 98765-4321',
          newContactCompany: 'Empresa Ltda',
        }),
      ),
    ).toEqual([])
    expect(
      errorPaths(
        form({
          isNewContact: true,
          clientId: '',
          newContactName: 'Marcelo Tavares',
          newContactEmail: 'not-an-email',
          newContactPhone: '(11) 98765-4321',
          newContactCompany: 'Empresa Ltda',
        }),
      ),
    ).toEqual(['newContactEmail'])
    expect(errorPaths(form())).toEqual([])
    expect(
      errorPaths(form({ dealKind: 'installment', amount: '18000', installments: '1' })),
    ).toEqual(['installments'])
    expect(
      errorPaths(form({ dealKind: 'installment', amount: '18000', installments: '3' })),
    ).toEqual([])
    expect(errorPaths(form({ dealKind: 'installment', amount: '0', installments: '1' }))).toEqual(
      [],
    )
    expect(errorPaths(form({ amount: 'abc' }))).toEqual(['amount'])
    expect(errorPaths(form({ amount: '-5' }))).toEqual(['amount'])
    expect(errorPaths(form({ tools: [tool({ toolId: '' })] }))).toEqual(['tools.0.toolId'])
    expect(errorPaths(form({ tools: [tool({ toolId: 'other' })] }))).toEqual(['tools.0.customName'])
    expect(errorPaths(form({ tools: [tool({ amount: '340,50' })] }))).toEqual([
      'tools.0.nextInvoice',
    ])
    expect(errorPaths(form({ tools: [tool({ amount: 'abc' })] }))).toEqual(['tools.0.amount'])
    expect(errorPaths(form({ tools: [tool({ amount: '-5' })] }))).toEqual(['tools.0.amount'])
    expect(errorPaths(form({ repoPath: 'just-a-name' }))).toEqual(['repoPath'])
  })

  it('maps forms to projects and back', async () => {
    expect(parseAmount('18.000,50')).toBe(18000.5)
    expect(hasPositiveAmount('0')).toBe(false)
    expect(toProject(form({ dealKind: 'upfront', amount: '18.000,50' })).deal.amount).toBe(18000.5)
    expect(toProject(form({ tools: [tool()] })).tools[0]?.billing).toBeUndefined()

    const paid = toProject(
      form({
        tools: [tool({ amount: '340,50', nextInvoice: '2026-09-05', payer: 'client' })],
      }),
    ).tools[0]
    expect(paid).toMatchObject({
      name: 'AWS',
      category: 'deploy',
      billing: { amount: 340.5, payer: 'client' },
    })

    const other = toProject(
      form({ tools: [tool({ toolId: 'other', customName: 'TOTVS Protheus' })] }),
    ).tools[0]
    expect(other).toMatchObject({ name: 'TOTVS Protheus', category: 'other' })

    expect(toProject(form({ repoPath: 'user/repo/' })).repo).toEqual({
      fullName: 'user/repo',
      url: 'https://github.com/user/repo',
      workflow: 'none',
    })
    expect(toProject(form({ repoPath: 'https://github.com/user/repo' })).repo?.fullName).toBe(
      'user/repo',
    )
    expect(toProject(form({ repoPath: 'http://www.github.com/user/repo' })).repo?.fullName).toBe(
      'user/repo',
    )

    const created = toProject(form({ dealKind: 'installment', amount: '100', installments: '3' }))
    expect(created.deal).toMatchObject({ kind: 'installment', installments: 3 })

    const original = toProject(form({ repoPath: 'user/repo', tools: [tool({ toolId: 'vercel' })] }))
    original.repo = { ...original.repo!, workflow: 'success' }
    original.description = 'Nota'
    original.comments = [{ id: 'c1', author: 'Ada', createdAt: '2026-08-01T10:00', body: 'Oi' }]
    const edited = toProject(fromProject(original), original)
    expect(edited.repo?.workflow).toBe('success')
    expect(edited.description).toBe('Nota')
    expect(
      toProject({ ...fromProject(original), repoPath: 'another/repo' }, original).repo?.workflow,
    ).toBe('none')

    const unknown = toProject(
      form({ tools: [tool({ toolId: 'not-in-catalog', customName: 'X' })] }),
    )
    expect(unknown.tools[0]?.name).toBe('not-in-catalog')

    const fromUnknown = fromProject({
      ...created,
      deal: { kind: 'upfront', amount: 10 },
      tools: [{ id: 'custom', name: 'Mine', category: 'other', secrets: [] }],
    })
    expect(fromUnknown.tools[0]?.customName).toBe('Mine')
    expect(fromUnknown.currency).toBe('BRL')
    expect(fromUnknown.installments).toBe('2')
    expect(toProject(form({ tools: [tool({ account: '' })] })).tools[0]?.account).toBeUndefined()

    await i18n.changeLanguage('en-US')
    expect(toProject(form({ amount: '18,000.50' })).deal.amount).toBe(18000.5)
    expect(toProject(form({ amount: 'not-a-number' })).deal.amount).toBe(0)
  })
})
