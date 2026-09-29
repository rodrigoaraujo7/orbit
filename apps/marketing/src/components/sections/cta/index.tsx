import { buttonVariants } from "ui/button"
import { cn } from "ui/utils"
import type { Dictionary } from "@/i18n"
import { signUpUrl } from "@/lib/site"

export function Cta({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-20">
        <h2 className="max-w-2xl font-heading text-4xl tracking-tight md:text-5xl">
          {dictionary.cta.title}
        </h2>
        <p className="max-w-xl text-muted-foreground">{dictionary.cta.subtitle}</p>
        <a href={signUpUrl()} className={cn(buttonVariants({ size: "lg" }))}>
          {dictionary.cta.button}
        </a>
      </div>
    </section>
  )
}
