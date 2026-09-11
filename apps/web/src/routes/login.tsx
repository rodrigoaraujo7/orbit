import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AuthShell } from "@/components/layout/auth-shell"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
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
import i18n, { getLocale } from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { authErrorMessage } from "@/lib/auth-errors"
import { cn } from "@/lib/utils"

const RESEND_COOLDOWN_SECONDS = 30

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

/** Sign-in walks credentials then the emailed code; confirmation is a dialog. */
type Step = "credentials" | "otp"

function authSchema(mode: "signin" | "signup", step: Step) {
  return z.object({
    name:
      step === "credentials" && mode === "signup"
        ? z.string().trim().min(2, i18n.t("auth.minChars"))
        : z.string(),
    email:
      step === "credentials"
        ? z
            .string()
            .trim()
            .min(1, i18n.t("auth.emailRequired"))
            .refine(
              (value) => z.string().email().safeParse(value).success,
              i18n.t("auth.emailInvalid"),
            )
        : z.string(),
    password:
      step === "credentials"
        ? mode === "signup"
          ? z.string().min(1, i18n.t("auth.passwordRequired")).min(8, i18n.t("auth.passwordMin"))
          : z.string().min(1, i18n.t("auth.passwordRequired"))
        : z.string(),
    code:
      step === "otp"
        ? z
            .string()
            .trim()
            .regex(/^\d{6}$/, i18n.t("auth.codeRequired"))
        : z.string(),
  })
}

type AuthFormValues = z.infer<ReturnType<typeof authSchema>>

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [step, setStep] = useState<Step>("credentials")
  const [pendingEmail, setPendingEmail] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [confirmCooldown, setConfirmCooldown] = useState(0)
  const [notice, setNotice] = useState("")
  const [confirmNotice, setConfirmNotice] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: (values, context, options) =>
      zodResolver(authSchema(mode, step))(values, context, options),
    defaultValues: { name: "", email: "", password: "", code: "" },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (confirmCooldown <= 0) return
    const timer = setTimeout(() => setConfirmCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [confirmCooldown])

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin")
    setStep("credentials")
    setValue("code", "")
    setNotice("")
    clearErrors()
  }

  function showConfirmation(email: string) {
    setPendingEmail(email)
    setConfirmNotice("")
    setConfirmError("")
    setConfirmOpen(true)
    setMode("signin")
    setStep("credentials")
  }

  async function requestCode() {
    const result = await authClient.twoFactor.sendOtp()
    if (result.error) {
      setError("code", { message: authErrorMessage(result.error, t("auth.resendFailed")) })
      return false
    }
    setCooldown(RESEND_COOLDOWN_SECONDS)
    return true
  }

  async function resendCode() {
    clearErrors("code")
    setNotice("")
    if (await requestCode()) setNotice(t("auth.codeResent"))
  }

  async function resendConfirmation() {
    setConfirmError("")
    setConfirmNotice("")
    const result = await authClient.sendVerificationEmail({
      email: pendingEmail,
      callbackURL: "/",
    })
    if (result.error) {
      setConfirmError(authErrorMessage(result.error, t("auth.resetLinkFailed")))
      return
    }
    setConfirmCooldown(RESEND_COOLDOWN_SECONDS)
    setConfirmNotice(t("auth.linkResent"))
  }

  const onSubmit = handleSubmit(async (values) => {
    if (step === "otp") {
      const result = await authClient.twoFactor.verifyOtp({ code: values.code })
      if (result.error) {
        setError("code", { message: authErrorMessage(result.error, t("auth.invalidCode")) })
        return
      }
      await navigate({ to: "/" })
      return
    }

    if (mode === "signup") {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        locale: getLocale(),
      })
      if (result.error) {
        setError("password", {
          message: authErrorMessage(result.error, t("auth.signUpFailed")),
        })
        return
      }
      showConfirmation(values.email)
      return
    }

    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    })
    if (result.error) {
      // Better Auth resends the confirmation link along with this failure.
      if (result.error.code === "EMAIL_NOT_VERIFIED") {
        showConfirmation(values.email)
        return
      }
      setError("password", {
        message: authErrorMessage(result.error, t("auth.signInFailed")),
      })
      return
    }
    if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
      setPendingEmail(values.email)
      setStep("otp")
      setValue("code", "")
      await requestCode()
      return
    }
    await navigate({ to: "/" })
  })

  return (
    <AuthShell onSubmit={onSubmit}>
      <div className="flex flex-col items-start gap-2">
        <h1
          key={`${step}-${mode}`}
          className="font-subtitle text-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
        >
          {step === "otp" ? (
            t("auth.verificationCode")
          ) : (
            <>
              {mode === "signin" ? t("auth.signInTo") : t("auth.createAccountOn")}
              <span className="shimmer shimmer-color-[oklch(from_var(--primary)_0.82_c_h)] [animation-delay:1s] text-primary font-heading text-[1.15em] italic">
                {t("auth.brand")}
              </span>
            </>
          )}
        </h1>
        {step === "credentials" && (
          <p
            key={mode}
            className="text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          >
            {mode === "signin" ? t("auth.noAccount") : t("auth.hasAccount")}
            <Button
              type="button"
              variant="link"
              className="inline h-auto p-0 text-white no-underline transition-colors duration-150 hover:no-underline hover:text-muted-foreground"
              onClick={switchMode}
            >
              {mode === "signin" ? t("auth.create") : t("auth.signIn")}
            </Button>
            .
          </p>
        )}
        {step === "otp" && (
          <p className="text-sm text-muted-foreground">
            {t("auth.codeSentTo", { email: pendingEmail })}
          </p>
        )}
      </div>
      {step === "credentials" && (
        <>
          <div
            className={cn(
              "grid transition-[grid-template-rows,margin] duration-300 ease-out motion-reduce:transition-none",
              mode === "signup" ? "grid-rows-[1fr]" : "grid-rows-[0fr] -mb-4",
            )}
          >
            <div className="min-h-0 overflow-hidden" inert={mode !== "signup"}>
              <Field label={t("common.name")} error={errors.name?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register("name")}
                    autoComplete="name"
                    tabIndex={mode === "signup" ? undefined : -1}
                  />
                )}
              </Field>
            </div>
          </div>
          <Field label={t("common.email")} error={errors.email?.message}>
            {(props) => (
              <Input {...props} {...register("email")} type="email" autoComplete="email" />
            )}
          </Field>
          <Field label={t("auth.password")} error={errors.password?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("password")}
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            )}
          </Field>
          {mode === "signin" && (
            <Link
              to="/forgot-password"
              className="-mt-1 self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("auth.forgotPassword")}
            </Link>
          )}
        </>
      )}
      {step === "otp" && (
        <>
          <Field label={t("auth.emailCode")} error={errors.code?.message} hint={notice}>
            {(props) => (
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <InputOTP
                    {...props}
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                    containerClassName="w-full"
                  >
                    <InputOTPGroup className="w-full">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          aria-invalid={props["aria-invalid"]}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
            )}
          </Field>
          <Button
            type="button"
            variant="link"
            className="-mt-1 h-auto self-start p-0 text-xs text-muted-foreground no-underline hover:text-foreground hover:underline"
            disabled={cooldown > 0}
            onClick={() => void resendCode()}
          >
            {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resendCode")}
          </Button>
        </>
      )}
      <Button
        type="submit"
        className="shadow-[0_0_16px_rgba(192,58,74,0.45)] transition-shadow duration-[350ms] hover:bg-primary hover:shadow-[0_0_28px_rgba(192,58,74,0.7)] active:translate-y-0"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? t("common.wait")
          : step === "otp"
            ? t("auth.verify")
            : mode === "signin"
              ? t("auth.signIn")
              : t("auth.signUp")}
      </Button>
      <ResponsiveDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <div>
              <ResponsiveDialogTitle>{t("auth.confirmEmailTitle")}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t("auth.confirmEmailDescription", { email: pendingEmail })}
              </ResponsiveDialogDescription>
            </div>
            <ResponsiveDialogClose />
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="flex flex-col gap-2">
            {confirmNotice && <p className="text-xs text-muted-foreground">{confirmNotice}</p>}
            {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={confirmCooldown > 0}
              onClick={() => void resendConfirmation()}
            >
              {confirmCooldown > 0
                ? t("auth.resendIn", { seconds: confirmCooldown })
                : t("auth.resendLink")}
            </Button>
            <Button type="button" onClick={() => setConfirmOpen(false)}>
              {t("auth.backToSignIn")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </AuthShell>
  )
}
