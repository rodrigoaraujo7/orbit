import { describe, expect, it } from 'vitest'
import type { Project } from '../data/projects.ts'
import { todayIso } from './dates.ts'
import {
  columnsEqual,
  groupProjectsByStatus,
  isProjectStatus,
  moveProjectInList,
  placeProjectInColumns,
  projectIdsByStatus,
  projectsFromColumns,
  withProjectStatus,
} from './project-status.ts'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Projeto',
    clientId: 'c1',
    status: 'in-development',
    startedAt: '2026-01-10',
    deal: { kind: 'upfront', amount: 0 },
    tools: [],
    repo: null,
    ...overrides,
  }
}

describe('project-status', () => {
  it('guards and stamps endedAt', () => {
    expect(isProjectStatus('in-validation')).toBe(true)
    expect(isProjectStatus('nope')).toBe(false)
    expect(withProjectStatus(project(), 'completed').endedAt).toBe(todayIso())
    expect(
      withProjectStatus(project({ status: 'completed', endedAt: '2025-11-30' }), 'completed')
        .endedAt,
    ).toBe('2025-11-30')
    expect(
      withProjectStatus(project({ endedAt: '2025-11-30' }), 'in-development').endedAt,
    ).toBeUndefined()
  })

  it('groups, moves and places cards', () => {
    const column = [
      project({ id: 'a', status: 'queued' }),
      project({ id: 'b', status: 'queued' }),
      project({ id: 'c', status: 'queued' }),
      project({ id: 'd', status: 'in-development' }),
    ]
    expect(groupProjectsByStatus(column).queued.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(moveProjectInList(column, 'missing', 'queued', 0)).toBe(column)
    expect(
      groupProjectsByStatus(moveProjectInList(column, 'a', 'queued', 2)).queued.map((p) => p.id),
    ).toEqual(['b', 'c', 'a'])
    expect(
      groupProjectsByStatus(moveProjectInList(column, 'c', 'queued', 0)).queued.map((p) => p.id),
    ).toEqual(['c', 'a', 'b'])
    expect(
      groupProjectsByStatus(moveProjectInList(column, 'a', 'queued', 1)).queued.map((p) => p.id),
    ).toEqual(['b', 'a', 'c'])
    expect(
      groupProjectsByStatus(moveProjectInList(column, 'd', 'paused', 0)).paused.map((p) => p.id),
    ).toEqual(['d'])
    expect(moveProjectInList(column, 'a', 'queued', 99).find((p) => p.id === 'a')).toBeTruthy()

    const ids = projectIdsByStatus(column)
    expect(placeProjectInColumns(ids, 'a', 'in-development', 'd')['in-development']).toEqual([
      'a',
      'd',
    ])
    expect(placeProjectInColumns(ids, 'a', 'in-development', null)['in-development']).toEqual([
      'd',
      'a',
    ])
    expect(placeProjectInColumns(ids, 'a', 'queued', 'missing')['queued']).toContain('a')
    expect(columnsEqual(ids, placeProjectInColumns(ids, 'a', 'queued', 'b'))).toBe(true)
    expect(columnsEqual(ids, placeProjectInColumns(ids, 'a', 'paused', null))).toBe(false)

    const committed = projectsFromColumns(
      column,
      placeProjectInColumns(ids, 'a', 'in-development', 'd'),
    )
    expect(committed.find((p) => p.id === 'a')?.status).toBe('in-development')
    expect(projectsFromColumns(column, { ...ids, queued: ['ghost', ...ids.queued] }).length).toBe(
      column.length,
    )
  })
})
