import type { CSSProperties } from "react"
import { Reveal } from "@/components/reveal"
import type { Dictionary } from "@/i18n"
import { Timeline } from "./timeline"

const STEPS = ["addClient", "createProject", "track"] as const

export function How({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="how" className="scroll-mt-24 border-t border-border/70">
      <div className="page-wrap px-6 py-20">
        <Reveal>
          <h2 className="max-w-2xl font-heading text-4xl tracking-tight md:text-5xl">
            {dictionary.how.title}
          </h2>
        </Reveal>
        <Timeline>
          {STEPS.map((key, index) => {
            const step = dictionary.how[key]
            return (
              <li key={key} className="how-step" style={{ "--step": index } as CSSProperties}>
                {index < STEPS.length - 1 ? (
                  <span className="how-connector" aria-hidden="true">
                    <span className="how-connector-track" />
                    <span className="how-connector-progress" />
                  </span>
                ) : null}
                <div className="how-step-body">
                  <span className="how-node" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="how-step-copy">
                    <h3 className="text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </Timeline>
      </div>
    </section>
  )
}
