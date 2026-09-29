import { MessageSquare, PieChart, Receipt, Table2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "ui/card"
import type { Dictionary } from "@/i18n"

const ITEMS = [
  ["scattered", Table2],
  ["invoices", Receipt],
  ["secrets", MessageSquare],
  ["overview", PieChart],
] as const

export function Pains({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section id="pains" className="scroll-mt-24 border-t border-border/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="max-w-2xl font-heading text-4xl tracking-tight md:text-5xl">
          {dictionary.pains.title}
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">{dictionary.pains.subtitle}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {ITEMS.map(([key, Icon]) => {
            const item = dictionary.pains[key]
            return (
              <Card key={key}>
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
