import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Plug, Unplug } from "lucide-react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { GitHubIcon } from "@/components/ui/github-icon"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import i18n from "@/i18n"
import { trpc } from "@/lib/trpc"

const TOKEN_SETTINGS_URL =
  "https://github.com/settings/tokens/new?scopes=repo&description=Projects%20Manager"

function tokenSchema() {
  return z.object({
    token: z.string().trim().min(1, i18n.t("validation.enterGithubToken")),
  })
}

type TokenFormValues = z.infer<ReturnType<typeof tokenSchema>>

export function GithubPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  const statusQuery = useQuery({
    queryKey: ["github", "status"],
    queryFn: () => trpc.github.status.query(),
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["github"] })
    void queryClient.invalidateQueries({ queryKey: ["audit"] })
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TokenFormValues>({
    resolver: (values, ctx, opts) => zodResolver(tokenSchema())(values, ctx, opts),
    defaultValues: { token: "" },
  })

  const connect = useMutation({
    mutationFn: (token: string) => trpc.github.connect.mutate({ token }),
    onSuccess: () => {
      reset({ token: "" })
      toast.add({ title: t("github.tokenConnected"), type: "success" })
      invalidate()
    },
    onError: () => toast.add({ title: t("github.tokenConnectError"), type: "error" }),
  })

  const disconnect = useMutation({
    mutationFn: () => trpc.github.disconnect.mutate(),
    onSuccess: () => {
      toast.add({ title: t("github.tokenDisconnected"), type: "success" })
      invalidate()
    },
    onError: () => toast.add({ title: t("github.tokenDisconnectError"), type: "error" }),
  })

  const onSubmit = handleSubmit((values) => connect.mutate(values.token))
  const status = statusQuery.data

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitHubIcon className="size-4" />
            <h2 className="font-subtitle text-lg font-semibold tracking-tight">
              {t("github.title")}
            </h2>
            {status?.connected ? (
              <Badge variant="success">{t("github.connected")}</Badge>
            ) : (
              <Badge variant="muted">{t("github.disconnected")}</Badge>
            )}
          </div>
          {status?.connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingDisconnect(true)}
              disabled={disconnect.isPending}
            >
              <Unplug />
              {t("github.disconnect")}
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{t("github.panelDescription")}</p>

        {status?.connected ? (
          <p className="text-sm">
            {status.login
              ? t("github.connectedAs", { login: status.login })
              : t("github.connectedNoLogin")}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Field
              label={t("github.tokenLabel")}
              error={errors.token?.message}
              hint={t("github.tokenHint")}
            >
              {(props) => (
                <Input
                  {...props}
                  {...register("token")}
                  type="password"
                  autoComplete="off"
                  placeholder={t("github.tokenPlaceholder")}
                />
              )}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={connect.isPending}>
                <Plug />
                {connect.isPending ? t("github.connecting") : t("github.connect")}
              </Button>
              <a
                href={TOKEN_SETTINGS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("github.createToken")}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </form>
        )}
      </section>

      <ConfirmDialog
        open={confirmingDisconnect}
        onOpenChange={setConfirmingDisconnect}
        title={t("github.disconnectTitle")}
        description={t("github.disconnectDescription")}
        confirmLabel={t("github.disconnect")}
        confirmWord={t("github.disconnectWord")}
        onConfirm={() => disconnect.mutate()}
      />
    </div>
  )
}
