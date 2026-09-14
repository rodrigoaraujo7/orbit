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

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function forgotSchema() {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, i18n.t("auth.emailRequired"))
      .refine((value) => z.string().email().safeParse(value).success, i18n.t("auth.emailInvalid")),
  })
}

type ForgotFormValues = z.infer<ReturnType<typeof forgotSchema>>

function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: (values, context, options) => zodResolver(forgotSchema())(values, context, options),
    defaultValues: { email: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (result.error) {
      setError("email", { message: authErrorMessage(result.error, t("auth.resetLinkFailed")) })
      return
    }
    setSent(true)
  })

  return (
    <AuthShell onSubmit={onSubmit}>
      <div className="flex flex-col items-start gap-2">
        <h1 className="font-subtitle text-xl">{t("auth.forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {sent ? t("auth.resetLinkSent") : t("auth.forgotDescription")}
        </p>
      </div>
      {!sent && (
        <>
          <Field label={t("common.email")} error={errors.email?.message}>
            {(props) => (
              <Input {...props} {...register("email")} type="email" autoComplete="email" />
            )}
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.wait") : t("auth.sendResetLink")}
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
