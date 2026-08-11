import { Construction } from "lucide-react"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 border-b px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </div>
  )
}

/** Placeholder for the sections that have not been designed yet. */
export function ComingSoon({ section }: { section: string }) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center gap-3 px-6 py-24 text-center duration-500">
      <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Construction className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">
        A seção <span className="font-medium text-foreground">{section}</span>{" "}
        ainda está em construção.
      </p>
    </div>
  )
}
