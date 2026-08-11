export type SortState = { key: string; direction: "asc" | "desc" } | null

/**
 * Ciclo de clique no header: asc → desc → sem ordenação. Voltar pro "sem
 * ordenação" é o que devolve a lista na ordem original do backend.
 */
export function nextSort(current: SortState, key: string): SortState {
  if (current?.key !== key) return { key, direction: "asc" }
  if (current.direction === "asc") return { key, direction: "desc" }
  return null
}

function compare(a: string | number, b: string | number) {
  // localeCompare pra texto sair na ordem do pt-BR (acento não vai pro fim)
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "pt-BR")
  }
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Ordena sem mutar `rows`. Puro — dá pra rodar num self-check de node (ver
 * table-sort.check.ts). `sort` nulo ou coluna sem `sortValue` devolve a
 * ordem original.
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
