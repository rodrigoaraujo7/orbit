import { Emphasis } from "ui/emphasis"
import { buttonVariants } from "ui/button"
import { cn } from "ui/utils"
import type { Dictionary } from "@/i18n"
import { signUpUrl } from "@/lib/site"
import { HeroVisual } from "./visual"

export function Hero({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="product" className="relative overflow-hidden">
      <HeroVisual />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-24 md:py-32">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          {dictionary.hero.eyebrow}
        </p>
        <h1 className="max-w-3xl font-heading text-5xl leading-[1.05] tracking-tight md:text-7xl">
          {dictionary.hero.titleBefore}
          <Emphasis className="text-primary">{dictionary.hero.titleEmphasis}</Emphasis>
          {dictionary.hero.titleAfter}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{dictionary.hero.subtitle}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={signUpUrl()} className={cn(buttonVariants({ size: "lg" }))}>
            {dictionary.hero.primary}
          </a>
          <a href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            {dictionary.hero.secondary}
          </a>
        </div>
      </div>
    </section>
  )
}
