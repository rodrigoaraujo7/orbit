import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function TwoFactorCard() {
  const { data } = authClient.useSession()
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [totpUri, setTotpUri] = useState<string>()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const enabled = Boolean(data?.user.twoFactorEnabled)

  async function enable() {
    setError(undefined)
    setPending(true)
    const result = await authClient.twoFactor.enable({ password })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Não foi possível ativar o 2FA")
      return
    }
    if (result.data.method !== "totp") {
      setError("Use um aplicativo autenticador (TOTP)")
      return
    }
    setTotpUri(result.data.totpURI)
  }

  async function verify() {
    setError(undefined)
    setPending(true)
    const result = await authClient.twoFactor.verifyTotp({ code })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Código inválido")
      return
    }
    setTotpUri(undefined)
    setCode("")
    setPassword("")
  }

  return (
    <section className="mb-8 rounded-xl border p-4">
      <h2 className="font-heading text-lg">Autenticação em dois fatores</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {enabled
          ? "2FA ativo. É exigido para revelar senhas de ferramentas."
          : "Ative o 2FA para revelar senhas de ferramentas."}
      </p>
      {!enabled && (
        <div className="mt-4 flex max-w-sm flex-col gap-3">
          <Field label="Senha da conta" error={error}>
            {(props) => (
              <Input
                {...props}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>
          {totpUri && (
            <>
              <p className="break-all font-mono text-xs text-muted-foreground">{totpUri}</p>
              <Field label="Código TOTP">
                {(props) => (
                  <Input
                    {...props}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                )}
              </Field>
            </>
          )}
          <Button
            type="button"
            disabled={pending}
            onClick={() => void (totpUri ? verify() : enable())}
          >
            {totpUri ? "Confirmar código" : "Gerar QR / URI"}
          </Button>
        </div>
      )}
    </section>
  )
}
