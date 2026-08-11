import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, type SelectOption } from "@/components/ui/select"
import { paginate } from "@/lib/pagination"
import { nextSort, sortRows, type SortState } from "@/lib/table-sort"
import { cn } from "@/lib/utils"

export type { SortState }

/**
 * Descrição de uma coluna. `cell` recebe a linha inteira e devolve o que
 * renderizar — quem sabe formatar o dado é quem monta a tabela, o DataTable
 * só posiciona.
 */
export type Column<T> = {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /**
   * Valor comparável da coluna. Presente = coluna ordenável (o header vira
   * botão). Ausente = coluna estática.
   */
  sortValue?: (row: T) => string | number
  /**
   * Classes aplicadas no `th` **e** no `td` da coluna — é onde mora o
   * responsivo (`hidden md:table-cell`) sem precisar repetir nos dois.
   */
  className?: string
}

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: "10", label: "10 por página" },
  { value: "25", label: "25 por página" },
  { value: "50", label: "50 por página" },
]

/**
 * Tabela única da plataforma: colunas declarativas, ordenação em 3 estados
 * (asc → desc → sem ordenação) e paginação embutida.
 *
 * Ordena e pagina em memória sobre `data`. Quando o backend passar a fazer
 * isso, é aqui que entra o modo controlado.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  initialSort = null,
  pagination = true,
  emptyMessage = "Nenhum resultado encontrado.",
  className,
}: {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  initialSort?: SortState
  pagination?: boolean
  emptyMessage?: React.ReactNode
  className?: string
}) {
  const [sort, setSort] = useState<SortState>(initialSort)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState("10")

  function toggleSort(key: string) {
    setSort((current) => nextSort(current, key))
    setPage(1)
  }

  const sortColumn = sort ? columns.find((c) => c.key === sort.key) : undefined
  const sorted = sortRows(data, sort, sortColumn?.sortValue)

  const sliced = paginate(sorted, page, Number(pageSize))
  const rows = pagination ? sliced.pageItems : sorted

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {columns.map((column) => {
                const active = sort?.key === column.key
                const Icon = active
                  ? sort.direction === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown

                return (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-2.5 font-medium text-muted-foreground",
                      column.className
                    )}
                    aria-sort={
                      active
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {column.header}
                        <Icon
                          className={cn(
                            "size-3.5",
                            !active && "text-muted-foreground/50"
                          )}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  // stagger só nas primeiras linhas: com 50 por página o
                  // acumulado passaria de 2s de espera na última.
                  style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}
                  onClick={onRowClick && (() => onRowClick(row))}
                  className={cn(
                    "animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards border-b transition-colors duration-500 last:border-0 hover:bg-muted/50",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3", column.className)}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="mt-3 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
          <div className="w-full sm:w-44">
            <Select
              value={pageSize}
              onValueChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
              options={PAGE_SIZE_OPTIONS}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {sliced.page} de {sliced.pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={sliced.page <= 1}
              onClick={() => setPage(sliced.page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={sliced.page >= sliced.pageCount}
              onClick={() => setPage(sliced.page + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
