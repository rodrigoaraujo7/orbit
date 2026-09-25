import { useTranslation } from "react-i18next"

/**
 * Full-viewport hold while the session or workspace is still arriving.
 * The same mark is painted in `index.html` so the first byte on a cold
 * deploy matches this screen instead of a blank page.
 */
function LoadingScreen({ message }: { message?: string }) {
  const { t } = useTranslation()
  const failed = message !== undefined
  const label = message ?? t("common.openingWorkspace")

  return (
    <div
      role={failed ? "alert" : "status"}
      aria-live={failed ? "assertive" : "polite"}
      aria-busy={failed ? undefined : true}
      className="grid min-h-svh place-items-center bg-background px-6 text-center"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid size-16 place-items-center">
          <span
            aria-hidden
            className={
              failed
                ? "absolute inset-0 rounded-full border-2 border-border"
                : "absolute inset-0 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin"
            }
          />
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/30">
            P
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-2xl tracking-tight text-foreground">{t("auth.brand")}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

export { LoadingScreen }
