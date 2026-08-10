import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <div className="flex items-center justify-end gap-2 px-1 py-2">
      <span className="text-xs text-muted-foreground">
        Página {page} de {pageCount}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
