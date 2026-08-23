import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

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
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(undefined)
    setPending(true)
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Não foi possível entrar")
      return
    }
    await navigate({ to: "/" })
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Projects Manager</p>
          <h1 className="font-heading text-2xl">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h1>
        </div>
        {mode === "signup" && (
          <Field label="Nome">
            {(props) => (
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} required />
            )}
          </Field>
        )}
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
        <Button type="submit" disabled={pending}>
          {pending ? "Aguarde…" : mode === "signin" ? "Entrar" : "Cadastrar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Criar uma conta" : "Já tenho conta"}
        </Button>
      </form>
    </main>
  )
}
