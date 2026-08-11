export type SortState = { key: string; direction: "asc" | "desc" } | null

/**
 * Header click cycle: asc → desc → unsorted. Going back to "unsorted" is what
 * returns the list in the backend's original order.
 */
export function nextSort(current: SortState, key: string): SortState {
  if (current?.key !== key) return { key, direction: "asc" }
  if (current.direction === "asc") return { key, direction: "desc" }
  return null
}

function compare(a: string | number, b: string | number) {
  // localeCompare so text sorts in pt-BR order (accents do not go last)
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "pt-BR")
  }
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Sorts without mutating `rows`. Pure — can run in a node self-check (see
 * table-sort.check.ts). A null `sort`, or a column with no `sortValue`, returns
 * the original order.
 */
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  sortValue: ((row: T) => string | number) | undefined
): T[] {
  if (!sort || !sortValue) return rows
  const factor = sort.direction === "asc" ? 1 : -1
  return [...rows].sort((a, b) => compare(sortValue(a), sortValue(b)) * factor)
}
