import { useState } from "react"
import { Eye, EyeOff, KeyRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BILLING_CYCLE_LABEL,
  PAYER_LABEL,
  type Secret,
  type Tool,
} from "@/data/projects"
import { formatCurrency, formatDate } from "@/lib/format"
import { ToolIcon } from "./tool-icons"

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
            <span className="truncate">
              {revealed ? secret.value : "•".repeat(12)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ToolDetails({ tool }: { tool: Tool }) {
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
            {BILLING_CYCLE_LABEL[billing.cycle]}
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
              <dd>{PAYER_LABEL[billing.payer]}</dd>
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
