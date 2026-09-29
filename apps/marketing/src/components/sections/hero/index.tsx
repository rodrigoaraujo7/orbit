import { Emphasis } from "ui/emphasis"
import type { Dictionary, Locale } from "@/i18n"
import { appOrigin } from "@/lib/site"
import { AppMockup } from "./mockup"
import { PersonaRotator } from "./persona"
import { HeroVisual } from "./visual"

export function Hero({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  return (
    <section
      id="product"
      className="relative -mt-[var(--marketing-header-height,4rem)] overflow-hidden"
    >
      <HeroVisual />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 pt-[calc(var(--marketing-header-height,4rem)+6rem)] pb-14 md:pt-[calc(var(--marketing-header-height,4rem)+8rem)] md:pb-20">
        <PersonaRotator
          prefix={dictionary.hero.eyebrowPrefix}
          personas={Object.values(dictionary.hero.personas)}
          label={dictionary.hero.eyebrowLabel}
        />
        <h1 className="max-w-3xl font-heading text-5xl leading-[1.05] tracking-tight md:text-7xl">
          {dictionary.hero.titleBefore}
          <Emphasis className="text-primary">{dictionary.hero.titleEmphasis}</Emphasis>
          {dictionary.hero.titleAfter}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{dictionary.hero.subtitle}</p>
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-1000 motion-reduce:animate-none">
        <AppMockup copy={dictionary.mockup} locale={locale} address={new URL(appOrigin()).host} />
      </div>
    </section>
  )
}
