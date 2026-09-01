import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Languages } from "lucide-react"

import Grainient from "@/components/Grainient"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import i18n, { getLocale, setLocale, type Locale } from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { authErrorMessage } from "@/lib/auth-errors"
import { cn } from "@/lib/utils"

const LOCALE_ORDER = ["en-US", "pt-BR"] as const

function LocaleToggle() {
  const { t } = useTranslation()
  const locale = getLocale()
  const labels = {
    "en-US": t("common.english"),
    "pt-BR": t("common.portuguese"),
  } as const
  const [offset, setOffset] = useState(() => LOCALE_ORDER.indexOf(locale))

  function toggle() {
    const next: Locale = locale === "en-US" ? "pt-BR" : "en-US"
    setOffset((value) => value + 1)
    setLocale(next)
  }

  const reel = Array.from(
    { length: offset + 2 },
    (_, index) => LOCALE_ORDER[index % LOCALE_ORDER.length],
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={t("common.language")}
      onClick={toggle}
      className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <Languages />
      <span className="grid justify-items-start">
        {LOCALE_ORDER.map((code) => (
          <span key={code} className="invisible col-start-1 row-start-1 font-medium">
            {labels[code]}
          </span>
        ))}
        <span className="col-start-1 row-start-1 block h-[1.25em] overflow-hidden leading-[1.25em]">
          <span
            className="flex flex-col motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1.4,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateY(${-offset * 1.25}em)` }}
          >
            {reel.map((code, index) => (
              <span key={`${code}-${index}`} className="h-[1.25em] font-medium leading-[1.25em]">
                {labels[code]}
              </span>
            ))}
          </span>
        </span>
      </span>
    </Button>
  )
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function authSchema(mode: "signin" | "signup", step: "credentials" | "totp") {
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
    totp:
      step === "totp"
        ? z
            .string()
            .trim()
            .regex(/^\d{6}$/, i18n.t("auth.totpRequired"))
        : z.string(),
  })
}

type AuthFormValues = z.infer<ReturnType<typeof authSchema>>

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [step, setStep] = useState<"credentials" | "totp">("credentials")
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: (values, context, options) =>
      zodResolver(authSchema(mode, step))(values, context, options),
    defaultValues: { name: "", email: "", password: "", totp: "" },
  })

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin")
    setStep("credentials")
    setValue("totp", "")
    clearErrors()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (step === "totp") {
      const result = await authClient.twoFactor.verifyTotp({ code: values.totp })
      if (result.error) {
        setError("totp", { message: authErrorMessage(result.error, t("auth.invalidCode")) })
        return
      }
      await navigate({ to: "/" })
      return
    }
    const result =
      mode === "signup"
        ? await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password,
          })
        : await authClient.signIn.email({ email: values.email, password: values.password })
    if (result.error) {
      setError("password", {
        message: authErrorMessage(
          result.error,
          mode === "signup" ? t("auth.signUpFailed") : t("auth.signInFailed"),
        ),
      })
      return
    }
    if (
      mode === "signin" &&
      result.data &&
      "twoFactorRedirect" in result.data &&
      result.data.twoFactorRedirect
    ) {
      setStep("totp")
      return
    }
    await navigate({ to: "/" })
  })

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Grainient
          color1="#c03a4a"
          color2="#020202"
          color3="#c03a4a"
          timeSpeed={0.5}
          colorBalance={-0.5}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.3}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
      <form
        onSubmit={onSubmit}
        noValidate
        className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-xl bg-card/40 p-6 shadow-lg ring-1 ring-white/10 backdrop-blur-xl"
      >
        <div className="flex flex-col items-start gap-2">
          <div className="flex w-full items-start justify-between gap-2">
            <div className="grid size-10 place-items-center rounded-lg bg-muted text-base font-bold text-muted-foreground">
              P
            </div>
            <LocaleToggle />
          </div>
          <h1
            key={`${step}-${mode}`}
            className="font-subtitle text-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
          >
            {step === "totp" ? (
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
        </div>
        {step === "credentials" && (
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
        )}
        {step === "credentials" && (
          <>
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
          </>
        )}
        {step === "totp" && (
          <Field label={t("auth.totp")} error={errors.totp?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("totp")}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            )}
          </Field>
        )}
        <Button
          type="submit"
          className="shadow-[0_0_16px_rgba(192,58,74,0.45)] transition-shadow duration-[350ms] hover:bg-primary hover:shadow-[0_0_28px_rgba(192,58,74,0.7)] active:translate-y-0"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t("common.wait")
            : step === "totp"
              ? t("auth.verify")
              : mode === "signin"
                ? t("auth.signIn")
                : t("auth.signUp")}
        </Button>
      </form>
    </main>
  )
}
