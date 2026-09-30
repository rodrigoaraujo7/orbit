"use client"

import { Check } from "lucide-react"
import { useState, type KeyboardEvent, type PointerEvent } from "react"
import { buttonVariants } from "ui/button"
import { cn } from "ui/utils"
import { Reveal } from "@/components/reveal"
import type { Dictionary } from "@/i18n"
import { signUpUrl } from "@/lib/site"
import { applyPointerVars, clearPointerVars, pointerVars } from "../features/pointer"
import {
  formatUsd,
  fill,
  intervalFromKey,
  PRO_MONTHLY_USD,
  proMonthlyAmount,
  yearlyDiscountPercent,
  yearlyTotalUsd,
  type BillingInterval,
} from "./plans"

const FREE_BENEFITS = ["projects", "clients", "kanban", "dashboard"] as const
const PRO_BENEFITS = ["unlimited", "invoices", "secrets", "github", "audit"] as const

function onPointerMove(event: PointerEvent<HTMLElement>) {
  const node = event.currentTarget
  applyPointerVars(
    node.style,
    pointerVars(node.getBoundingClientRect(), event.clientX, event.clientY),
  )
}

function onPointerEnter(event: PointerEvent<HTMLElement>) {
  event.currentTarget.dataset.active = ""
}

function onPointerLeave(event: PointerEvent<HTMLElement>) {
  const node = event.currentTarget
  clearPointerVars(node.style)
  delete node.dataset.active
}

function BenefitList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-6">
          <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function PlanCard({
  name,
  description,
  price,
  compareAt,
  cadence,
  note,
  includes,
  benefits,
  cta,
  featured,
}: {
  name: string
  description: string
  price: string
  compareAt?: string
  cadence: string
  note: string
  includes: string
  benefits: readonly string[]
  cta: string
  featured?: boolean
}) {
  return (
    <article
      data-featured={featured ? "" : undefined}
      onPointerEnter={featured ? onPointerEnter : undefined}
      onPointerMove={featured ? onPointerMove : undefined}
      onPointerLeave={featured ? onPointerLeave : undefined}
      className={cn(
        "pricing-card relative flex h-full flex-col overflow-hidden rounded-4xl bg-card p-8 ring-1",
        featured ? "ring-primary/50" : "ring-foreground/10",
      )}
    >
      {featured ? <div aria-hidden className="pricing-wash" /> : null}
      <div className="relative z-10 flex h-full flex-col">
        <h3 className="text-lg font-medium">{name}</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
        <p className="mt-8 flex items-baseline gap-2">
          <span className="font-heading text-6xl leading-none tracking-tight">{price}</span>
          {compareAt ? (
            <span className="text-base text-muted-foreground line-through">{compareAt}</span>
          ) : null}
          <span className="text-sm text-muted-foreground">{cadence}</span>
        </p>
        <p className="mt-2 min-h-5 text-sm text-muted-foreground">{note}</p>
        <p className="mt-8 text-sm font-medium">{includes}</p>
        <BenefitList items={benefits} />
        <a
          href={signUpUrl()}
          className={cn(
            buttonVariants({ size: "lg", variant: featured ? "default" : "outline" }),
            "mt-8 w-full",
            featured && "border-transparent bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          {cta}
        </a>
      </div>
    </article>
  )
}

export function Pricing({ dictionary }: { dictionary: Dictionary }) {
  const [interval, setInterval] = useState<BillingInterval>("yearly")
  const copy = dictionary.pricing
  const yearly = interval === "yearly"
  const proPrice = formatUsd(proMonthlyAmount(interval))
  const discount = fill(copy.save, { percent: yearlyDiscountPercent() })

  function onBillingKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = intervalFromKey(event.key)
    if (!next) return
    event.preventDefault()
    setInterval(next)
  }

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-24 border-t border-border/70"
    >
      <div className="page-wrap px-6 py-20">
        <Reveal>
          <h2 id="pricing-title" className="font-heading text-4xl tracking-tight md:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">{copy.subtitle}</p>
        </Reveal>
        <Reveal delay={40} className="mt-8">
          <div
            role="radiogroup"
            aria-label={copy.billing}
            className="inline-flex rounded-full bg-card p-1 ring-1 ring-foreground/10"
            onKeyDown={onBillingKeyDown}
          >
            {(
              [
                ["monthly", copy.monthly],
                ["yearly", copy.yearly],
              ] as const
            ).map(([value, label]) => {
              const selected = interval === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={value === "yearly" ? `${label} ${discount}` : label}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setInterval(value)}
                >
                  {label}
                  {value === "yearly" ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {discount}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </Reveal>
        <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
          <Reveal className="h-full">
            <PlanCard
              name={copy.free.name}
              description={copy.free.description}
              price={formatUsd(0)}
              cadence={copy.perMonth}
              note={copy.freeForever}
              includes={copy.free.includes}
              benefits={FREE_BENEFITS.map((key) => copy.free.benefits[key])}
              cta={copy.free.cta}
            />
          </Reveal>
          <Reveal delay={80} className="h-full">
            <PlanCard
              featured
              name={copy.pro.name}
              description={copy.pro.description}
              price={proPrice}
              compareAt={yearly ? formatUsd(PRO_MONTHLY_USD) : undefined}
              cadence={copy.perMonth}
              note={yearly ? fill(copy.billedYearly, { amount: formatUsd(yearlyTotalUsd()) }) : ""}
              includes={copy.pro.includes}
              benefits={PRO_BENEFITS.map((key) => copy.pro.benefits[key])}
              cta={copy.pro.cta}
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
