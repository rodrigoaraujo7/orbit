/**
 * Client-side Kanban filters. Pure, no React — the page decides how to draw,
 * this decides what is visible.
 *
 * Relative imports on purpose: the self-check runs on
 * `node --experimental-strip-types`, and Node does not resolve the "@/" alias.
 */
import type { Project } from "../data/projects.ts"
import { monthOf } from "./dates.ts"

export type KanbanFilters = {
  search: string
  /** "" = every client. */
  clientId: string
  /** "YYYY-MM", empty = no lower bound. */
  monthFrom: string
  /** "YYYY-MM", empty = no upper bound. */
  monthTo: string
}

export const emptyKanbanFilters: KanbanFilters = {
  search: "",
  clientId: "",
  monthFrom: "",
  monthTo: "",
}

export function matchesKanbanFilter(
  project: Project,
  filters: KanbanFilters,
  clientName: string
): boolean {
  const search = filters.search.trim().toLowerCase()
  if (
    search &&
    !project.name.toLowerCase().includes(search) &&
    !clientName.toLowerCase().includes(search)
  ) {
    return false
  }
  if (filters.clientId && project.clientId !== filters.clientId) return false

  const started = monthOf(project.startedAt)
  if (filters.monthFrom && started < filters.monthFrom) return false
  if (filters.monthTo && started > filters.monthTo) return false

  return true
}
