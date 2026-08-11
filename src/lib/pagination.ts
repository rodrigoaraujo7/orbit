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
