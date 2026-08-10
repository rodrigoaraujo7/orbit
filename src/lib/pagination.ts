import { useState } from "react"

export const DEFAULT_PAGE_SIZE = 10

/**
 * Fatia `items` pra página pedida. Pura — sem depender de estado do React —
 * pra dar pra rodar num self-check de node (ver pagination.check.ts) e ser
 * reaproveitada por qualquer tabela do projeto.
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize
  return { pageItems: items.slice(start, start + pageSize), pageCount, page: safePage }
}

/** Estado de página + fatia atual. `pageSize` fixo em `DEFAULT_PAGE_SIZE` por padrão. */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  return { ...paginate(items, page, pageSize), setPage }
}
