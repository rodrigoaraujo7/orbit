import type { Dictionary } from "@/i18n"

const STEPS = ["addClient", "createProject", "track"] as const

export function How({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="how" className="scroll-mt-24 border-t border-border/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="max-w-2xl font-heading text-4xl tracking-tight md:text-5xl">
          {dictionary.how.title}
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((key, index) => {
            const step = dictionary.how[key]
            return (
              <li key={key}>
                <p className="font-heading text-3xl text-primary italic">{index + 1}</p>
                <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
