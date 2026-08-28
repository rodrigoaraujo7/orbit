import { useState } from "react"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { type Secret, type Tool } from "@/data/projects"
import { billingCycleLabel, payerLabel } from "@/i18n/labels"
import { formatCurrency, formatDate } from "@/lib/format"
import { ToolIcon } from "./tool-icons"

async function copySecret(secret: Secret) {
  try {
    await navigator.clipboard.writeText(secret.value)
    toast.add({ title: `${secret.key} copiado`, type: "success" })
  } catch {
    toast.add({ title: "Não foi possível copiar", type: "error" })
  }
}

function SecretList({ secrets }: { secrets: Secret[] }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="mt-2 rounded-lg bg-muted/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <KeyRound className="size-3.5" />
          {secrets.length} {secrets.length === 1 ? "secret" : "secrets"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? <EyeOff /> : <Eye />}
          {revealed ? "Ocultar" : "Revelar"}
        </Button>
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">
        {secrets.map((secret) => (
          <li
            key={secret.key}
            className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs"
          >
            <span className="text-muted-foreground">{secret.key}</span>
            <button
              type="button"
              onClick={() => copySecret(secret)}
              className="truncate rounded-sm px-1 -mx-1 cursor-pointer transition-colors hover:bg-muted"
            >
              {revealed ? secret.value : "•".repeat(12)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ToolDetails({ tool }: { tool: Tool }) {
  useTranslation()
  const { billing } = tool

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <ToolIcon id={tool.id} className="size-4 shrink-0" />
          {tool.name}
        </span>
        {billing ? (
          <Badge variant="default">
            {formatCurrency(billing.amount, billing.currency)} ·{" "}
            {billingCycleLabel(billing.cycle)}
          </Badge>
        ) : (
          <Badge variant="outline">Free</Badge>
        )}
      </div>

      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <div className="flex gap-1">
          <dt>Conta:</dt>
          <dd>{tool.account ?? "não registrada"}</dd>
        </div>
        {billing && (
          <>
            <div className="flex gap-1">
              <dt>Quem paga:</dt>
              <dd>{payerLabel(billing.payer)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Fatura:</dt>
              <dd>{formatDate(billing.nextInvoice)}</dd>
            </div>
          </>
        )}
      </dl>

      {tool.secrets.length > 0 && <SecretList secrets={tool.secrets} />}
    </li>
  )
}
