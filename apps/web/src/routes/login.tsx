import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import Grainient from "@/components/Grainient"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [step, setStep] = useState<"credentials" | "totp">("credentials")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totp, setTotp] = useState("")
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin")
    setStep("credentials")
    setTotp("")
    setError(undefined)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(undefined)
    setPending(true)
    if (step === "totp") {
      const result = await authClient.twoFactor.verifyTotp({ code: totp })
      setPending(false)
      if (result.error) {
        setError(result.error.message ?? "Código inválido")
        return
      }
      await navigate({ to: "/" })
      return
    }
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Não foi possível entrar")
      return
    }
    if (mode === "signin" && result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
      setStep("totp")
      return
    }
    await navigate({ to: "/" })
  }

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Grainient
          color1="#020202"
          color2="#020202"
          color3="#c03a4a"
          timeSpeed={0.7}
          colorBalance={-0.15}
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
        className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-xl bg-card/40 p-6 shadow-lg ring-1 ring-white/25 backdrop-blur-xl"
      >
        <div className="flex flex-col items-start gap-2">
          <div className="grid size-10 place-items-center rounded-lg bg-muted text-base font-bold text-muted-foreground">
            P
          </div>
          <h1 className="font-subtitle text-xl">
            {step === "totp" ? (
              "Código de verificação"
            ) : (
              <>
                {mode === "signin" ? "Entrar em " : "Criar conta em "}
                <span className="pm-text-shimmer font-heading text-[1.15em] italic">Projects Manager</span>
              </>
            )}
          </h1>
          {step === "credentials" && (
            <p className="text-sm text-muted-foreground">
              {mode === "signin" ? "Não tem uma conta? " : "Já tem uma conta? "}
              <Button
                type="button"
                variant="link"
                className="inline h-auto p-0 text-white no-underline transition-colors duration-150 hover:no-underline hover:text-muted-foreground"
                onClick={switchMode}
              >
                {mode === "signin" ? "Criar" : "Entrar"}
              </Button>
              .
            </p>
          )}
        </div>
        {step === "credentials" && mode === "signup" && (
          <Field label="Nome">
            {(props) => (
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} required />
            )}
          </Field>
        )}
        {step === "credentials" && (
          <>
            <Field label="E-mail">
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Senha" error={error}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              )}
            </Field>
          </>
        )}
        {step === "totp" && (
          <Field label="Código TOTP" error={error}>
            {(props) => (
              <Input
                {...props}
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            )}
          </Field>
        )}
        <Button
          type="submit"
          className="shadow-[0_0_16px_rgba(192,58,74,0.45)] transition-shadow duration-[350ms] hover:bg-primary hover:shadow-[0_0_28px_rgba(192,58,74,0.7)] active:translate-y-0"
          disabled={pending}
        >
          {pending ? "Aguarde…" : step === "totp" ? "Verificar" : mode === "signin" ? "Entrar" : "Cadastrar"}
        </Button>
      </form>
    </main>
  )
}
