import { KeyRound, Mail, Shield } from "lucide-react"
import { Reveal } from "@/components/reveal"
import type { Dictionary } from "@/i18n"

const ITEMS = [
  ["isolation", Shield],
  ["encryption", KeyRound],
  ["emailCode", Mail],
] as const

export function Security({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="security" className="scroll-mt-24 border-t border-border/70">
      <div className="page-wrap px-6 py-20">
        <Reveal>
          <h2 className="font-heading text-4xl tracking-tight md:text-5xl">
            {dictionary.security.title}
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">{dictionary.security.subtitle}</p>
        </Reveal>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {ITEMS.map(([key, Icon], index) => {
            const item = dictionary.security[key]
            return (
              <Reveal
                as="li"
                key={key}
                delay={index * 80}
                className="rounded-4xl bg-card p-6 ring-1 ring-foreground/10"
              >
                <Icon aria-hidden className="text-primary" />
                <h3 className="mt-4 text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.body}</p>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
