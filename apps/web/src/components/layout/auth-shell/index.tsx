import { Languages } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import Grainient from "@/components/Grainient"
import { Button } from "@/components/ui/button"
import { getLocale, setLocale, type Locale } from "@/i18n"

const LOCALE_ORDER = ["en-US", "pt-BR"] as const

function LocaleToggle() {
  const { t } = useTranslation()
  const locale = getLocale()
  const labels = {
    "en-US": t("common.english"),
    "pt-BR": t("common.portuguese"),
  } as const
  const [offset, setOffset] = useState(() => LOCALE_ORDER.indexOf(locale))

  function toggle() {
    const next: Locale = locale === "en-US" ? "pt-BR" : "en-US"
    setOffset((value) => value + 1)
    setLocale(next)
  }

  const reel = Array.from(
    { length: offset + 2 },
    (_, index) => LOCALE_ORDER[index % LOCALE_ORDER.length],
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={t("common.language")}
      onClick={toggle}
      className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <Languages />
      <span className="grid justify-items-start">
        {LOCALE_ORDER.map((code) => (
          <span key={code} className="invisible col-start-1 row-start-1 font-medium">
            {labels[code]}
          </span>
        ))}
        <span className="col-start-1 row-start-1 block h-[1.25em] overflow-hidden leading-[1.25em]">
          <span
            className="flex flex-col motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1.4,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateY(${-offset * 1.25}em)` }}
          >
            {reel.map((code, index) => (
              <span key={`${code}-${index}`} className="h-[1.25em] font-medium leading-[1.25em]">
                {labels[code]}
              </span>
            ))}
          </span>
        </span>
      </span>
    </Button>
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
        <LocaleToggle />
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
