import { Link } from "@tanstack/react-router"
import { Compass, RotateCcw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

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
  details,
}: {
  code: string
  title: string
  description: string
  icon?: ReactNode
  actions?: ReactNode
  details?: string
}) {
  const { t } = useTranslation()
  return (
    <main className="animate-in fade-in zoom-in-95 grid min-h-full place-items-center px-6 py-24 duration-500">
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
        {details && (
          <details className="mt-2 w-full text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              {t("errors.details")}
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap text-muted-foreground">
              {details}
            </pre>
          </details>
        )}
      </div>
    </main>
  )
}

function BackToDashboard() {
  const { t } = useTranslation()
  return (
    <Button variant="outline" size="sm" render={<Link to="/" />}>
      <Compass />
      {t("errors.backToDashboard")}
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
      actions={<BackToDashboard />}
    />
  )
}

function RouteErrorPage({ error, reset }: { error?: unknown; reset?: () => void }) {
  const { t } = useTranslation()
  const message = error instanceof Error ? error.message : undefined
  return (
    <ErrorPage
      code={t("errors.genericCode")}
      title={t("errors.genericTitle")}
      description={t("errors.genericDescription")}
      details={message}
      actions={
        <>
          <Button size="sm" onClick={() => (reset ? reset() : window.location.reload())}>
            <RotateCcw />
            {t("errors.tryAgain")}
          </Button>
          <BackToDashboard />
        </>
      }
    />
  )
}

export { ErrorPage, NotFoundPage, RouteErrorPage }
