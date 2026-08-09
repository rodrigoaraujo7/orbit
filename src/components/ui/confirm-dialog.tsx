import { AlertDialog } from "@base-ui/react/alert-dialog"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  /** presente = exige digitar essa palavra pra habilitar o botão de confirmar */
  confirmWord,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  confirmWord?: string
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState("")
  // dialog fica montado o tempo todo (animação de saída) — limpa o campo
  // toda vez que abre de novo. Ajuste durante o render em vez de efeito:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setTyped("")
  }

  const confirmDisabled =
    confirmWord != null && typed.trim().toLowerCase() !== confirmWord.toLowerCase()

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <AlertDialog.Title className="text-base font-semibold tracking-tight">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>

          {confirmWord != null && (
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="confirm-word">
                Digite{" "}
                <span className="font-medium text-destructive">
                  {confirmWord}
                </span>{" "}
                para confirmar
              </Label>
              <Input
                id="confirm-word"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close render={<Button variant="ghost" />}>
              Cancelar
            </AlertDialog.Close>
            <Button
              variant="destructive"
              disabled={confirmDisabled}
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
