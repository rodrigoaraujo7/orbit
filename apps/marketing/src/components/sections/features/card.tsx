"use client"

import type { PointerEvent, ReactNode } from "react"
import { cn } from "ui/utils"
import { Reveal } from "@/components/reveal"
import { applyPointerVars, clearPointerVars, pointerVars } from "./pointer"

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

/** A tap ends with pointerleave right away, so touch keeps the card revealed. */
function onPointerLeave(event: PointerEvent<HTMLElement>) {
  const node = event.currentTarget
  clearPointerVars(node.style)
  if (event.pointerType !== "touch") delete node.dataset.active
}

export function BentoCard({
  index,
  title,
  body,
  art,
  className,
}: {
  index: number
  title: string
  body: string
  art: ReactNode
  className?: string
}) {
  return (
    <Reveal delay={index * 70} className={cn("h-full", className)}>
      <article
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="bento-card group relative isolate flex h-full flex-col overflow-hidden rounded-4xl bg-card ring-1 ring-foreground/10 transition-[box-shadow] duration-500 data-active:ring-foreground/20"
      >
        <div aria-hidden className="bento-spotlight" />
        <div
          aria-hidden
          className="relative h-52 shrink-0 text-foreground lg:h-auto lg:min-h-0 lg:flex-1"
        >
          <div className="absolute inset-4">{art}</div>
        </div>
        <div className="relative px-6 pb-6">
          <p className="font-mono text-[0.7rem] tracking-[0.2em] text-muted-foreground/60">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-lg font-medium">{title}</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
        </div>
      </article>
    </Reveal>
  )
}
