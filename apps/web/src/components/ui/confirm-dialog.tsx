import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

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
  confirmLabel,
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
  const { t } = useTranslation()
  const resolvedConfirmLabel = confirmLabel ?? t("common.confirm")
  const resolvedConfirmWord = confirmWord ?? t("common.deleteWord")
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
    typed.trim().toLowerCase() !== resolvedConfirmWord.toLowerCase()

  const confirmPrompt = t("common.typeToConfirm", { word: resolvedConfirmWord }).split(
    resolvedConfirmWord,
  )

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
        <ResponsiveDialogBody>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-word">
              {confirmPrompt[0]}
              <Emphasis italic={false} className="text-destructive">
                {resolvedConfirmWord}
              </Emphasis>
              {confirmPrompt[1]}
            </Label>
            <Input
              id="confirm-word"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {resolvedConfirmLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
