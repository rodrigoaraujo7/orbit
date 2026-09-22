import { Link } from "@tanstack/react-router"
import { ArrowLeft, Compass, RotateCcw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

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
  fullScreen = false,
}: {
  code: string
  title: string
  description: string
  icon?: ReactNode
  actions?: ReactNode
  fullScreen?: boolean
}) {
  return (
    <main
      className={`animate-in fade-in zoom-in-95 grid place-items-center px-6 py-24 duration-500 ${
        fullScreen ? "min-h-svh" : "min-h-full"
      }`}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
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

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <ErrorPage
      code={t("errors.notFoundCode")}
      title={t("errors.notFoundTitle")}
      description={t("errors.notFoundDescription")}
      icon={<Compass className="size-5" />}
      actions={<HomeLink />}
      fullScreen
    />
  )
}

function RouteErrorPage({ reset }: { error?: unknown; reset?: () => void }) {
  const { t } = useTranslation()
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
