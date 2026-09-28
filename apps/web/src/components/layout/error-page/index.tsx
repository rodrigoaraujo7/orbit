import { Link, useRouterState } from "@tanstack/react-router"
import { ArrowLeft, Compass, RotateCcw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import Beams from "@/components/ui/Beams"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

const glassCardClassName =
  "relative z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-card/40 p-6 text-center shadow-lg ring-1 ring-white/10 backdrop-blur-xl"

/**
 * Full-height stop screen shared by the router: the 404 for addresses that do
 * not resolve and the fallback for a route that threw while rendering.
 */
function ErrorPage({
  code,
  title,
  description,
  icon,
  actions,
}: {
  code: string
  title: string
  description: string
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <main className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <Beams
            beamWidth={2}
            beamHeight={14}
            beamNumber={14}
            lightColor="#c03a4a"
            speed={2.3}
            noiseIntensity={1.75}
            scale={0.15}
            rotation={0}
          />
        </div>
      </div>
      <div className={glassCardClassName}>
        <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
          {icon ?? <TriangleAlert className="size-5" />}
        </div>
        <p className="font-heading text-6xl leading-none font-normal text-muted-foreground/40">
          {code}
        </p>
        <div className="flex flex-col gap-1">
          <h1 className="font-subtitle text-xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>
        )}
      </div>
    </main>
  )
}

function HomeLink() {
  const { t } = useTranslation()
  const { data } = authClient.useSession()
  if (data) {
    return (
      <Button variant="outline" size="sm" render={<Link to="/" />}>
        <ArrowLeft />
        {t("errors.backToDashboard")}
      </Button>
    )
  }
  return (
    <Button variant="outline" size="sm" render={<Link to="/login" />}>
      <ArrowLeft />
      {t("auth.backToSignIn")}
    </Button>
  )
}

function useRouterPending() {
  return useRouterState({ select: (state) => state.status === "pending" })
}

function NotFoundPage() {
  const { t } = useTranslation()
  const pending = useRouterPending()
  if (pending) return null
  return (
    <ErrorPage
      code={t("errors.notFoundCode")}
      title={t("errors.notFoundTitle")}
      description={t("errors.notFoundDescription")}
      icon={<Compass className="size-5" />}
      actions={<HomeLink />}
    />
  )
}

function RouteErrorPage({ reset }: { error?: unknown; reset?: () => void }) {
  const { t } = useTranslation()
  const pending = useRouterPending()
  if (pending) return null
  return (
    <ErrorPage
      code={t("errors.genericCode")}
      title={t("errors.genericTitle")}
      description={t("errors.genericDescription")}
      actions={
        <>
          <HomeLink />
          <Button size="sm" onClick={() => (reset ? reset() : window.location.reload())}>
            <RotateCcw />
            {t("errors.tryAgain")}
          </Button>
        </>
      }
    />
  )
}

export { ErrorPage, NotFoundPage, RouteErrorPage }
