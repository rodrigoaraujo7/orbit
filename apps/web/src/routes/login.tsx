import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { z } from "zod"

import { AuthShell } from "@/components/layout/auth-shell"
import { Button } from "@/components/ui/button"
import { Emphasis } from "@/components/ui/emphasis"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import i18n, { getLocale } from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { authErrorMessage } from "@/lib/auth-errors"
import { cn } from "@/lib/utils"

const RESEND_COOLDOWN_SECONDS = 30

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

/** Sign-in walks credentials, then either the emailed code or the confirm-email copy. */
type Step = "credentials" | "otp" | "confirm"

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
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState("")
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

  function resetToCredentials(nextMode: "signin" | "signup") {
    setMode(nextMode)
    setStep("credentials")
    setValue("code", "")
    setNotice("")
    setCooldown(0)
    clearErrors()
  }

  function switchMode() {
    resetToCredentials(mode === "signin" ? "signup" : "signin")
  }

  function showConfirmation(email: string) {
    setPendingEmail(email)
    setNotice("")
    setCooldown(0)
    setMode("signin")
    setStep("confirm")
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
    clearErrors("root")
    setNotice("")
    const result = await authClient.sendVerificationEmail({
      email: pendingEmail,
      callbackURL: "/",
    })
    if (result.error) {
      setError("root", { message: authErrorMessage(result.error, t("auth.resetLinkFailed")) })
      return
    }
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setNotice(t("auth.linkResent"))
  }

  const onSubmit = handleSubmit(async (values) => {
    if (step === "confirm") return

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
        const field =
          result.error.code === "USER_ALREADY_EXISTS" ||
          result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "email"
            : "password"
        setError(field, {
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

  const heading =
    step === "otp"
      ? t("auth.verificationCode")
      : step === "confirm"
        ? t("auth.confirmEmailTitle")
        : null

  return (
    <AuthShell onSubmit={onSubmit}>
      <div className="flex flex-col items-start gap-2">
        <h1
          key={`${step}-${mode}`}
          className="font-subtitle text-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
        >
          {heading ?? (
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
            <Trans
              i18nKey="auth.codeSentTo"
              values={{ email: pendingEmail }}
              components={{ email: <Emphasis className="text-primary" /> }}
            />
          </p>
        )}
        {step === "confirm" && (
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="auth.confirmEmailDescription"
              values={{ email: pendingEmail }}
              components={{ email: <Emphasis className="text-primary" /> }}
            />
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
      {step === "confirm" && (
        <>
          {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
          {errors.root?.message && (
            <p className="text-xs text-destructive">{errors.root.message}</p>
          )}
          <Button
            type="button"
            variant="link"
            className="-mt-1 h-auto self-start p-0 text-xs text-muted-foreground no-underline hover:text-foreground hover:underline"
            disabled={cooldown > 0}
            onClick={() => void resendConfirmation()}
          >
            {cooldown > 0 ? t("auth.resendLinkIn", { seconds: cooldown }) : t("auth.resendLink")}
          </Button>
        </>
      )}
      {step === "confirm" ? (
        <Button type="button" variant="secondary" onClick={() => resetToCredentials("signin")}>
          {t("auth.backToSignIn")}
        </Button>
      ) : (
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
      )}
    </AuthShell>
  )
}
