import { Emphasis } from "ui/emphasis"
import { Reveal } from "@/components/reveal"
import type { Dictionary, Locale } from "@/i18n"
import { appOrigin } from "@/lib/site"
import { AppMockup } from "./mockup"
import { HeroVisual } from "./visual"

export function Hero({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  return (
    <section
      id="product"
      className="relative -mt-[var(--marketing-header-height,4rem)] overflow-hidden"
    >
      <HeroVisual />
      <Reveal
        immediate
        delay={160}
        className="relative page-wrap flex flex-col gap-8 px-6 pt-[calc(var(--marketing-header-height,4rem)+9rem)] pb-14 md:pt-[calc(var(--marketing-header-height,4rem)+12rem)] md:pb-20"
      >
        <h1 className="max-w-3xl font-heading text-5xl leading-[1.05] tracking-tight md:text-7xl">
          {dictionary.hero.titleBefore}
          <span className="md:block">
            <Emphasis className="text-primary underline decoration-primary decoration-[0.06em] underline-offset-[0.18em]">
              {dictionary.hero.titleEmphasis}
            </Emphasis>
            {dictionary.hero.titleAfter}
          </span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{dictionary.hero.subtitle}</p>
      </Reveal>
      <Reveal immediate delay={320} className="relative page-wrap px-6 pb-24">
        <AppMockup copy={dictionary.mockup} locale={locale} address={new URL(appOrigin()).host} />
      </Reveal>
    </section>
  )
}
