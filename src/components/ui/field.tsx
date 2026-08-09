import { useId, type ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Agrupa label + controle + mensagem de erro com espaçamento padronizado.
 * Passa o `id` gerado e o estado de erro pro controle via render prop.
 */
function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  className?: string
  children: (props: {
    id: string
    "aria-invalid": boolean
    "aria-describedby": string | undefined
  }) => ReactNode
}) {
  const id = useId()
  const messageId = `${id}-message`

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {(error || hint) && (
        <p
          id={messageId}
          className={cn(
            "text-xs",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export { Field }
