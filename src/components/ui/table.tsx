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
 * Description of a column. `cell` gets the whole row and returns what to
 * render — whoever builds the table knows how to format the data, the DataTable
 * only lays it out.
 */
export type Column<T> = {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /**
   * Comparable value of the column. Present = sortable column (the header
   * becomes a button). Absent = static column.
   */
  sortValue?: (row: T) => string | number
  /**
   * Classes applied to both the column's `th` **and** `td` — this is where the
   * responsive bits (`hidden md:table-cell`) live without repeating them twice.
   */
  className?: string
}

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: "10", label: "10 por página" },
  { value: "25", label: "25 por página" },
  { value: "50", label: "50 por página" },
]

/**
 * The platform's single table: declarative columns, 3-state sorting
 * (asc → desc → unsorted) and built-in pagination.
 *
 * Sorts and paginates `data` in memory. Once the backend does that, this is
 * where a controlled mode goes in.
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
                  // stagger only on the first rows: with 50 per page the total
                  // delay would go past 2s on the last one.
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
