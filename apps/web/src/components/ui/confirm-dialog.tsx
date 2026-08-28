import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Emphasis } from "@/components/ui/emphasis"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"

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

  const confirmField =
    confirmWord != null ? (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-word">
          Digite{" "}
          <Emphasis italic={false} className="text-destructive">
            {confirmWord}
          </Emphasis>{" "}
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
    ) : null

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="max-w-sm">
        <ResponsiveDialogHeader>
          <div>
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-left">
              {description}
            </ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        {confirmField != null && (
          <ResponsiveDialogBody>{confirmField}</ResponsiveDialogBody>
        )}
        <ResponsiveDialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
