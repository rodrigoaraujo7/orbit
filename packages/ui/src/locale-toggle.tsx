"use client"

import { Languages } from "lucide-react"
import { useState } from "react"

import { Button, buttonVariants } from "./button"
import { cn } from "./utils"

const STEP = 1.25

function LocaleReel({
  order,
  labels,
  offset,
}: {
  order: readonly [string, string]
  labels: Record<string, string>
  offset: number
}) {
  const reel = Array.from(
    { length: offset + 2 },
    (_, index) => order[index % order.length] as string,
  )

  return (
    <span className="grid justify-items-start">
      {order.map((code) => (
        <span key={code} className="invisible col-start-1 row-start-1 font-medium">
          {labels[code]}
        </span>
      ))}
      <span className="col-start-1 row-start-1 block h-[1.25em] overflow-hidden leading-[1.25em]">
        <span
          className="flex flex-col motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1.4,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateY(${-offset * STEP}em)` }}
        >
          {reel.map((code, index) => (
            <span key={`${code}-${index}`} className="h-[1.25em] font-medium leading-[1.25em]">
              {labels[code]}
            </span>
          ))}
        </span>
      </span>
    </span>
  )
}

type LocaleToggleProps = {
  locale: string
  order: readonly [string, string]
  labels: Record<string, string>
  label: string
} & (
  | { onToggle: () => void; href?: never; hrefLang?: never }
  | { href: string; hrefLang: string; onToggle?: never }
)

export function LocaleToggle({ locale, order, labels, label, ...action }: LocaleToggleProps) {
  const [offset, setOffset] = useState(() => Math.max(0, order.indexOf(locale)))
  const className = "shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
  const reel = <LocaleReel order={order} labels={labels} offset={offset} />

  if ("href" in action) {
    return (
      <a
        href={action.href}
        hrefLang={action.hrefLang}
        lang={action.hrefLang}
        aria-label={label}
        className={cn(buttonVariants({ variant: "ghost", size: "xs" }), className)}
      >
        <Languages />
        {reel}
      </a>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={label}
      onClick={() => {
        setOffset((value) => value + 1)
        action.onToggle()
      }}
      className={className}
    >
      <Languages />
      {reel}
    </Button>
  )
}
