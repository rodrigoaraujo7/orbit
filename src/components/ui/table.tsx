import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-muted/50", className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y", className)} {...props} />
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-muted/30", className)} {...props} />
}

type SortDirection = "asc" | "desc" | null

export function TableHead({
  className,
  sortDirection,
  onSort,
  children,
  ...props
}: React.ComponentProps<"th"> & {
  sortDirection?: SortDirection
  onSort?: () => void
}) {
  if (!onSort) {
    return (
      <th
        className={cn(
          "px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase",
          className
        )}
        {...props}
      >
        {children}
      </th>
    )
  }

  const SortIcon =
    sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown

  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        {children}
        <SortIcon className="size-3" />
      </button>
    </th>
  )
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />
}
