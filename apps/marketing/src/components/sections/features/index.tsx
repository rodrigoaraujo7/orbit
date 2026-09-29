import { ChartPie, GitBranch, Kanban, Lock, Receipt, ScrollText } from "lucide-react"
import { Card, CardContent, CardHeader } from "ui/card"
import type { Dictionary } from "@/i18n"

const ITEMS = [
  ["kanban", Kanban],
  ["invoices", Receipt],
  ["finance", ChartPie],
  ["secrets", Lock],
  ["github", GitBranch],
  ["audit", ScrollText],
] as const

export function Features({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="features" className="scroll-mt-24 border-t border-border/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-heading text-4xl tracking-tight md:text-5xl">
          {dictionary.features.title}
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">{dictionary.features.subtitle}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(([key, Icon]) => {
            const item = dictionary.features[key]
            return (
              <Card key={key} size="sm">
                <CardHeader>
                  <Icon aria-hidden className="text-primary" />
                  <h3 className="font-heading text-base font-medium">{item.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
