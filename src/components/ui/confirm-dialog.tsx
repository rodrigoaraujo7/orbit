import { Dialog } from "@base-ui/react/dialog"
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
  /** present = the user must type this word to enable the confirm button */
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
  // the dialog stays mounted all the time (exit animation) — clears the field
  // every time it opens again. Adjusted during render instead of an effect:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setTyped("")
  }

  const confirmDisabled =
    confirmWord != null && typed.trim().toLowerCase() !== confirmWord.toLowerCase()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Title className="text-base font-semibold tracking-tight">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>

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
            <Dialog.Close render={<Button variant="ghost" />}>
              Cancelar
            </Dialog.Close>
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
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
