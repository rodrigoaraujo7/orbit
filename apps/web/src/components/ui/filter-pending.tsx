import type { ReactNode } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

/**
 * Loading for a filtered query: skeleton on the first paint, and a muted
 * result set plus a hairline bordô scan while the next page of filters is
 * in flight. Filters stay interactive above this region.
 */
export function FilterPending({
  isPending,
  isFetching,
  skeleton,
  children,
  className,
}: {
  isPending: boolean
  isFetching: boolean
  skeleton: ReactNode
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  const refetching = isFetching && !isPending

  return (
    <div className={className}>
      {refetching && !reduced ? <FilterScan /> : null}
      {isPending ? (
        skeleton
      ) : (
        <div
          aria-busy={refetching || undefined}
          className={cn(refetching && "opacity-50 transition-opacity duration-200")}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function FilterScan() {
  return (
    <div className="relative h-px overflow-hidden bg-primary/20" aria-hidden="true">
      <div className="absolute inset-y-0 w-1/3 bg-primary animate-filter-scan" />
    </div>
  )
}

export function TableFilterSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-9 animate-pulse rounded-md bg-muted" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-md bg-muted/70" />
      ))}
    </div>
  )
}

export function KanbanFilterSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 px-4 pt-6 xl:grid-cols-4 sm:px-6 lg:px-8">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="flex h-[calc(100svh-16rem)] min-h-0 gap-3 overflow-hidden px-4 py-3 md:h-[calc(100svh-19.5rem)] md:py-6 sm:px-6 lg:px-8">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex h-full w-72 shrink-0 flex-col gap-2 rounded-2xl bg-muted/40 p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/80" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardFilterSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl bg-muted xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
