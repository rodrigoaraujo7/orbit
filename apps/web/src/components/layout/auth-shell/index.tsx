import { type FormEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { LocaleToggle } from "ui/locale-toggle"

import Grainient from "@/components/Grainient"
import { getLocale, setLocale, type Locale } from "@/i18n"

const LOCALE_ORDER = ["en-US", "pt-BR"] as const

function LanguageButton() {
  const { t } = useTranslation()
  const locale = getLocale()
  const next: Locale = locale === "en-US" ? "pt-BR" : "en-US"
  return (
    <LocaleToggle
      locale={locale}
      order={LOCALE_ORDER}
      labels={{ "en-US": t("common.english"), "pt-BR": t("common.portuguese") }}
      label={t("common.language")}
      onToggle={() => setLocale(next)}
    />
  )
}

/**
 * Card over the animated gradient shared by every signed-out screen. Screens
 * with nothing to submit (a dead reset link) get a plain container instead.
 */
function AuthShell({
  children,
  onSubmit,
}: {
  children: ReactNode
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}) {
  const cardClassName =
    "relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-xl bg-card/40 p-6 shadow-lg ring-1 ring-white/10 backdrop-blur-xl"
  const header = (
    <>
      <div className="flex w-full items-start justify-between gap-2">
        <div className="grid size-10 place-items-center rounded-lg bg-muted text-base font-bold text-muted-foreground">
          P
        </div>
        <LanguageButton />
      </div>
      {children}
    </>
  )

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Grainient
          color1="#c03a4a"
          color2="#020202"
          color3="#c03a4a"
          timeSpeed={0.5}
          colorBalance={-0.5}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.3}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
      {onSubmit ? (
        <form onSubmit={onSubmit} noValidate className={cardClassName}>
          {header}
        </form>
      ) : (
        <div className={cardClassName}>{header}</div>
      )}
    </main>
  )
}

export { AuthShell }
