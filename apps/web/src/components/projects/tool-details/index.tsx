import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Eye, EyeOff, KeyRound, Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { SECRET_VALUE_MASK, type Secret, type Tool } from "@/data/projects"
import i18n from "@/i18n"
import { billingCycleLabel, freeLabel, payerLabel } from "@/i18n/labels"
import { formatCurrency, formatDate } from "@/lib/format"
import { trpc } from "@/lib/trpc"
import { EditSecretDialog, type EditableSecret } from "../edit-secret-dialog"
import { ToolIcon } from "../tool-icons"

function secretRevealErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message === "TOO_MANY_REQUESTS") return i18n.t("projects.secretRevealLimit")
  return i18n.t("projects.secretRevealError")
}

function SecretList({ secrets }: { secrets: Secret[] }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [plaintexts, setPlaintexts] = useState<Record<string, string>>({})
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditableSecret | null>(null)

  function rowKey(secret: Secret, index: number) {
    return secret.id ?? `${secret.key}-${index}`
  }

  async function fetchPlaintext(secret: Secret) {
    if (secret.value) return secret.value
    if (!secret.id) throw new Error("missing")
    const result = await trpc.credentials.reveal.mutate({ id: secret.id })
    void queryClient.invalidateQueries({ queryKey: ["audit"] })
    if (!result.value) throw new Error("empty")
    return result.value
  }

  async function copySecret(secret: Secret, key: string) {
    let value: string
    try {
      value = plaintexts[key] ?? (await fetchPlaintext(secret))
    } catch (error) {
      toast.add({ title: secretRevealErrorMessage(error), type: "error" })
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      toast.add({ title: t("common.copied", { key: secret.key }), type: "success" })
    } catch {
      toast.add({ title: t("common.copyFailed"), type: "error" })
    }
  }

  async function toggleReveal(secret: Secret, key: string, isRevealed: boolean) {
    if (isRevealed) {
      setRevealed((current) => ({ ...current, [key]: false }))
      setPlaintexts((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      return
    }
    if (pendingKey) return
    setPendingKey(key)
    try {
      const value = await fetchPlaintext(secret)
      setPlaintexts((current) => ({ ...current, [key]: value }))
      setRevealed((current) => ({ ...current, [key]: true }))
    } catch (error) {
      toast.add({ title: secretRevealErrorMessage(error), type: "error" })
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className="mt-2 rounded-lg bg-muted/40 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <KeyRound className="size-3.5" />
        {t("common.secretCount", { count: secrets.length })}
      </div>
      <ul className="flex flex-col gap-1">
        {secrets.map((secret, index) => {
          const key = rowKey(secret, index)
          const isRevealed = Boolean(revealed[key])
          const secretId = secret.id
          return (
            <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
              <span className="text-muted-foreground">{secret.key}</span>
              <button
                type="button"
                onClick={() => void copySecret(secret, key)}
                className="min-w-0 truncate rounded-sm px-1 -mx-1 cursor-pointer transition-colors hover:bg-muted"
              >
                {isRevealed ? (plaintexts[key] ?? SECRET_VALUE_MASK) : SECRET_VALUE_MASK}
              </button>
              <span className="ml-auto flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={pendingKey === key}
                  aria-label={isRevealed ? t("common.hideValue") : t("common.revealValue")}
                  title={isRevealed ? t("common.hideValue") : t("common.revealValue")}
                  onClick={() => void toggleReveal(secret, key, isRevealed)}
                >
                  {isRevealed ? <EyeOff /> : <Eye />}
                </Button>
                {secretId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    aria-label={t("common.editSecret")}
                    title={t("common.editSecret")}
                    onClick={() => setEditing({ id: secretId, key: secret.key })}
                  >
                    <Pencil />
                  </Button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      <EditSecretDialog
        open={Boolean(editing)}
        onOpenChange={() => setEditing(null)}
        secret={editing}
      />
    </div>
  )
}

export function ToolDetails({ tool }: { tool: Tool }) {
  const { t } = useTranslation()
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
            {formatCurrency(billing.amount, billing.currency)} · {billingCycleLabel(billing.cycle)}
          </Badge>
        ) : (
          <Badge variant="outline">{freeLabel()}</Badge>
        )}
      </div>

      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <div className="flex gap-1">
          <dt>{t("projects.accountLabel")}</dt>
          <dd>{tool.account ?? t("common.notRegistered")}</dd>
        </div>
        {billing && (
          <>
            <div className="flex gap-1">
              <dt>{t("projects.whoPaysLabel")}</dt>
              <dd>{payerLabel(billing.payer)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("projects.invoiceLabel")}</dt>
              <dd>{formatDate(billing.nextInvoice)}</dd>
            </div>
          </>
        )}
      </dl>

      {tool.secrets.length > 0 && <SecretList secrets={tool.secrets} />}
    </li>
  )
}
