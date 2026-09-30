import type { ComponentType } from "react"
import { Reveal } from "@/components/reveal"
import type { Dictionary } from "@/i18n"
import { AuditArt, FinanceArt, GithubArt, InvoicesArt, KanbanArt, SecretsArt } from "./art"
import { BentoCard } from "./card"

type FeatureKey = "kanban" | "secrets" | "invoices" | "github" | "finance" | "audit"

/** Order and spans form the bento: wide Kanban and Finance, a tall Secrets column. */
const ITEMS: readonly { key: FeatureKey; Art: ComponentType; span: string }[] = [
  { key: "kanban", Art: KanbanArt, span: "md:col-span-2" },
  { key: "secrets", Art: SecretsArt, span: "lg:row-span-2" },
  { key: "invoices", Art: InvoicesArt, span: "" },
  { key: "github", Art: GithubArt, span: "" },
  { key: "finance", Art: FinanceArt, span: "md:col-span-2" },
  { key: "audit", Art: AuditArt, span: "" },
]

export function Features({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="features" className="scroll-mt-24 border-t border-border/70">
      <div className="page-wrap px-6 py-20">
        <Reveal>
          <h2 className="font-heading text-4xl tracking-tight md:text-5xl">
            {dictionary.features.title}
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">{dictionary.features.subtitle}</p>
        </Reveal>
        <div className="mt-10 grid grid-flow-row-dense gap-4 md:grid-cols-2 lg:auto-rows-[21rem] lg:grid-cols-3">
          {ITEMS.map(({ key, Art, span }, index) => {
            const item = dictionary.features[key]
            return (
              <BentoCard
                key={key}
                index={index}
                title={item.title}
                body={item.body}
                art={<Art />}
                className={span}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
