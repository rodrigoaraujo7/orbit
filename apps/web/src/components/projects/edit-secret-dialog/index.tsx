import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { toast } from "@/components/ui/toast"
import i18n from "@/i18n"
import { trpc } from "@/lib/trpc"

export type EditableSecret = {
  id: string
  key: string
}

function secretSchema() {
  return z.object({
    key: z.string().trim().min(1, i18n.t("validation.enterKey")),
    value: z.string().trim().min(1, i18n.t("validation.enterValue")),
  })
}

type SecretFormValues = z.infer<ReturnType<typeof secretSchema>>

export function EditSecretDialog({
  open,
  onOpenChange,
  secret,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: EditableSecret | null
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [revealed, setRevealed] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SecretFormValues>({
    resolver: (values, ctx, opts) => zodResolver(secretSchema())(values, ctx, opts),
    defaultValues: { key: "", value: "" },
  })

  const [active, setActive] = useState<EditableSecret | null>(secret)
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setActive(secret)
      setRevealed(false)
      reset({ key: secret?.key ?? "", value: "" })
    }
    wasOpen.current = open
  }, [open, secret, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!active) return
    try {
      await trpc.credentials.update.mutate({
        id: active.id,
        label: values.key,
        value: values.value,
      })
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices"] })
      void queryClient.invalidateQueries({ queryKey: ["audit"] })
      toast.add({ title: t("projects.secretUpdated"), type: "success" })
      onOpenChange(false)
    } catch {
      toast.add({ title: t("projects.secretUpdateError"), type: "error" })
    }
  })

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <div>
            <ResponsiveDialogTitle>{t("common.editSecret")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("common.editSecretDescription")}
            </ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="flex flex-col gap-4">
            <Field label={t("common.secretKey")} error={errors.key?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register("key")}
                  placeholder="API_KEY"
                  className="font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </Field>
            <Field label={t("common.secretValue")} error={errors.value?.message}>
              {(props) => (
                <div className="relative">
                  <Input
                    {...props}
                    {...register("value")}
                    type={revealed ? "text" : "password"}
                    placeholder={t("common.valuePlaceholder")}
                    className="pr-9 font-mono text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? t("common.hideValue") : t("common.revealValue")}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              )}
            </Field>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
