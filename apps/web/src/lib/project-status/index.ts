import { PROJECT_STATUS_ORDER, type Project, type ProjectStatus } from '../../data/projects.ts'
import { todayIso } from '../dates/index.ts'

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUS_ORDER as string[]).includes(value)
}

/**
 * Status change used by the Kanban drop, the issue-modal select, and `toProject`.
 * Completing a project stamps `endedAt` (tools drop off the dashboard meter);
 * leaving completed clears it so the meter starts again.
 */
export function withProjectStatus(project: Project, status: ProjectStatus): Project {
  return {
    ...project,
    status,
    endedAt: status === 'completed' ? (project.endedAt ?? todayIso()) : undefined,
  }
}

export function groupProjectsByStatus(projects: Project[]): Record<ProjectStatus, Project[]> {
  const groups = Object.fromEntries(
    PROJECT_STATUS_ORDER.map((status) => [status, [] as Project[]]),
  ) as Record<ProjectStatus, Project[]>

  for (const project of projects) {
    groups[project.status].push(project)
  }

  return groups
}

/**
 * Move a project to `toIndex` inside the `toStatus` column. Column order is
 * the relative order of those projects in the array — no separate rank field.
 * `toIndex` is the index after the item has been taken out of the list
 * (what dnd-kit reports on drop).
 */
export function moveProjectInList(
  projects: Project[],
  projectId: string,
  toStatus: ProjectStatus,
  toIndex: number,
): Project[] {
  const project = projects.find((item) => item.id === projectId)
  if (!project) return projects

  const moved = withProjectStatus(project, toStatus)
  const without = projects.filter((item) => item.id !== projectId)
  const column = without.filter((item) => item.status === toStatus)
  const index = Math.max(0, Math.min(toIndex, column.length))

  if (column.length === 0) return [...without, moved]

  if (index >= column.length) {
    const lastIdx = without.findIndex((item) => item.id === column[column.length - 1].id)
    return [...without.slice(0, lastIdx + 1), moved, ...without.slice(lastIdx + 1)]
  }

  const insertAt = without.findIndex((item) => item.id === column[index].id)
  return [...without.slice(0, insertAt), moved, ...without.slice(insertAt)]
}

export type ProjectColumns = Record<ProjectStatus, string[]>

export function projectIdsByStatus(projects: Project[]): ProjectColumns {
  const grouped = groupProjectsByStatus(projects)
  return Object.fromEntries(
    PROJECT_STATUS_ORDER.map((status) => [status, grouped[status].map((item) => item.id)]),
  ) as ProjectColumns
}

/** Insert `projectId` into `toStatus`, before `beforeId` (null = append). */
export function placeProjectInColumns(
  columns: ProjectColumns,
  projectId: string,
  toStatus: ProjectStatus,
  beforeId: string | null,
): ProjectColumns {
  const next = Object.fromEntries(
    PROJECT_STATUS_ORDER.map((status) => [
      status,
      columns[status].filter((id) => id !== projectId),
    ]),
  ) as ProjectColumns

  const column = next[toStatus]
  if (!beforeId) {
    column.push(projectId)
    return next
  }

  const index = column.indexOf(beforeId)
  column.splice(index < 0 ? column.length : index, 0, projectId)
  return next
}

export function columnsEqual(a: ProjectColumns, b: ProjectColumns): boolean {
  return PROJECT_STATUS_ORDER.every(
    (status) =>
      a[status].length === b[status].length &&
      a[status].every((id, index) => id === b[status][index]),
  )
}

export function projectsFromColumns(projects: Project[], columns: ProjectColumns): Project[] {
  const byId = new Map(projects.map((item) => [item.id, item]))
  const result: Project[] = []
  for (const status of PROJECT_STATUS_ORDER) {
    for (const id of columns[status]) {
      const project = byId.get(id)
      if (project) result.push(withProjectStatus(project, status))
    }
  }
  return result
}
