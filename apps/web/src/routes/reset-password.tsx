import { createFileRoute, Link } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AuthShell } from "@/components/layout/auth-shell"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import i18n from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { authErrorMessage } from "@/lib/auth-errors"

export const Route = createFileRoute("/reset-password")({
  /** Better Auth bounces the emailed link back here with the one-time token appended. */
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
})

function resetSchema() {
  return z
    .object({
      password: z
        .string()
        .min(1, i18n.t("auth.passwordRequired"))
        .min(8, i18n.t("auth.passwordMin")),
      confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
      path: ["confirm"],
      message: i18n.t("auth.passwordsMismatch"),
    })
}

type ResetFormValues = z.infer<ReturnType<typeof resetSchema>>

function ResetPasswordPage() {
  const { t } = useTranslation()
  const { token } = Route.useSearch()
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: (values, context, options) => zodResolver(resetSchema())(values, context, options),
    defaultValues: { password: "", confirm: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await authClient.resetPassword({ newPassword: values.password, token })
    if (result.error) {
      setError("password", { message: authErrorMessage(result.error, t("auth.resetFailed")) })
      return
    }
    setDone(true)
  })

  if (!token) {
    return (
      <AuthShell>
        <div className="flex flex-col items-start gap-2">
          <h1 className="font-subtitle text-xl">{t("auth.resetTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.invalidResetLink")}</p>
        </div>
        <Link
          to="/forgot-password"
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("auth.requestNewLink")}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell onSubmit={onSubmit}>
      <div className="flex flex-col items-start gap-2">
        <h1 className="font-subtitle text-xl">{t("auth.resetTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {done ? t("auth.resetDone") : t("auth.resetDescription")}
        </p>
      </div>
      {!done && (
        <>
          <Field label={t("auth.newPassword")} error={errors.password?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("password")}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>
          <Field label={t("auth.confirmPassword")} error={errors.confirm?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("confirm")}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.wait") : t("auth.resetPassword")}
          </Button>
        </>
      )}
      <Link
        to="/login"
        className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("auth.backToSignIn")}
      </Link>
    </AuthShell>
  )
}
