import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * `<select>` nativo estilizado — acessibilidade e comportamento mobile de
 * graça. Se um dia precisar de opções ricas (ícone, descrição), trocar pelo
 * Select do Base UI.
 */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-9 w-full appearance-none rounded-xl border border-border bg-background pr-9 pl-3 text-sm transition-[color,border-color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { Select }
