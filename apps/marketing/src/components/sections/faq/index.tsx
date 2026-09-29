import type { Dictionary } from "@/i18n"

const QUESTIONS = ["who", "data", "secrets", "start"] as const

export function Faq({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-border/70">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-heading text-4xl tracking-tight md:text-5xl">{dictionary.faq.title}</h2>
        <div className="mt-8 divide-y divide-border">
          {QUESTIONS.map((key) => {
            const item = dictionary.faq[key]
            return (
              <details key={key} className="group py-4">
                <summary className="cursor-pointer text-base font-medium">{item.q}</summary>
                <p className="pt-3 text-muted-foreground">{item.a}</p>
              </details>
            )
          })}
        </div>
      </div>
    </section>
  )
}
