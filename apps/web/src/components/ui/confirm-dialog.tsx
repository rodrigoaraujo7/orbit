import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Emphasis } from "@/components/ui/emphasis"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()
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

  const cancelButton = (
    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
      Cancelar
    </Button>
  )
  const confirmButton = (
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
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="text-left">{description}</DrawerDescription>
          </DrawerHeader>
          {confirmField != null && (
            <div className="flex-1 overflow-y-auto p-4">{confirmField}</div>
          )}
          <DrawerFooter className="flex-row [&>*]:flex-1">
            {cancelButton}
            {confirmButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-5">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>

        {confirmField != null && <div className="mt-4">{confirmField}</div>}

        <DialogFooter className="mt-5">
          {cancelButton}
          {confirmButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
