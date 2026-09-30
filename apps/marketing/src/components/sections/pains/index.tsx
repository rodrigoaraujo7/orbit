import { MessageSquare, PieChart, Receipt, Table2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "ui/card"
import { Reveal } from "@/components/reveal"
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
      <div className="page-wrap px-6 py-20">
        <Reveal>
          <h2 className="max-w-2xl font-heading text-4xl tracking-tight md:text-5xl">
            {dictionary.pains.title}
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">{dictionary.pains.subtitle}</p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {ITEMS.map(([key, Icon], index) => {
            const item = dictionary.pains[key]
            return (
              <Reveal key={key} delay={index * 70}>
                <Card>
                  <CardHeader>
                    <Icon aria-hidden className="text-primary" />
                    <h3 className="font-heading text-base font-medium">{item.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
