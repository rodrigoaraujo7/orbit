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

export type ServerPagination = {
  hasPrev: boolean
  hasNext: boolean
  pageSize: string
  onPrev: () => void
  onNext: () => void
  onPageSizeChange: (pageSize: string) => void
}

export type ServerSort = {
  sort: SortState
  onSortChange: (sort: SortState) => void
}

/**
 * The platform's single table: declarative columns, 3-state sorting
 * (asc → desc → unsorted) and built-in pagination.
 *
 * Sorts and paginates `data` in memory unless `serverPagination` or `serverSort`
 * is set, in which case the parent owns page order and/or sort.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  initialSort = null,
  pagination = true,
  serverPagination,
  serverSort,
  emptyMessage = "Nenhum resultado encontrado.",
  className,
}: {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  initialSort?: SortState
  pagination?: boolean
  serverPagination?: ServerPagination
  serverSort?: ServerSort
  emptyMessage?: React.ReactNode
  className?: string
}) {
  const [sort, setSort] = useState<SortState>(initialSort)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState("10")
  const isServer = Boolean(serverPagination)
  const activeSort = serverSort?.sort ?? sort

  function toggleSort(key: string) {
    if (serverSort) {
      serverSort.onSortChange(nextSort(serverSort.sort, key))
      return
    }
    setSort((current) => nextSort(current, key))
    setPage(1)
  }

  const sortColumn = activeSort
    ? columns.find((c) => c.key === activeSort.key)
    : undefined
  const sorted =
    isServer || serverSort ? data : sortRows(data, sort, sortColumn?.sortValue)

  const sliced = paginate(sorted, page, Number(pageSize))
  const rows = isServer ? data : pagination ? sliced.pageItems : sorted
  const showPager = isServer || pagination

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {columns.map((column) => {
                const active = activeSort?.key === column.key
                const Icon = active
                  ? activeSort.direction === "asc"
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
                        ? activeSort.direction === "asc"
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

      {showPager && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="w-44 min-w-0">
            <Select
              value={serverPagination?.pageSize ?? pageSize}
              onValueChange={(next) => {
                if (serverPagination) {
                  serverPagination.onPageSizeChange(next)
                  return
                }
                setPageSize(next)
                setPage(1)
              }}
              options={PAGE_SIZE_OPTIONS}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="sr-only">
              {isServer
                ? "Paginação"
                : `Página ${sliced.page} de ${sliced.pageCount}`}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isServer ? !serverPagination?.hasPrev : sliced.page <= 1}
              onClick={() =>
                isServer ? serverPagination?.onPrev() : setPage(sliced.page - 1)
              }
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={
                isServer ? !serverPagination?.hasNext : sliced.page >= sliced.pageCount
              }
              onClick={() =>
                isServer ? serverPagination?.onNext() : setPage(sliced.page + 1)
              }
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
