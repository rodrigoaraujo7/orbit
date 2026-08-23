/**
 * Slices `items` for the requested page. Pure — no React state involved — so it
 * can run in a node self-check (see pagination.check.ts) and be reused by any
 * table in the project.
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize
  return { pageItems: items.slice(start, start + pageSize), pageCount, page: safePage }
}
