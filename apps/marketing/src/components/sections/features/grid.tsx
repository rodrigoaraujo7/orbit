"use client"

import type { PointerEvent, ReactNode } from "react"
import { cn } from "ui/utils"
import { applySpotlight, fadeSpotlight, hoveredCard, pointerVars, spotlightPoint } from "./pointer"
import { usesScrollActivation } from "./scroll"

function trackPointer(event: PointerEvent<HTMLDivElement>) {
  if (usesScrollActivation()) return
  const grid = event.currentTarget
  const hovered = hoveredCard(event.target)

  for (const card of grid.querySelectorAll<HTMLElement>(".bento-card")) {
    const box = card.getBoundingClientRect()
    applySpotlight(card.style, spotlightPoint(box, event.clientX, event.clientY))
    if (card === hovered) {
      card.style.setProperty("--px", String(pointerVars(box, event.clientX, event.clientY).px))
    }
  }
}

function hidePointer(event: PointerEvent<HTMLDivElement>) {
  for (const card of event.currentTarget.querySelectorAll<HTMLElement>(".bento-card")) {
    fadeSpotlight(card.style)
  }
}

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn("bento-grid", className)}
      onPointerEnter={trackPointer}
      onPointerMove={trackPointer}
      onPointerLeave={hidePointer}
    >
      {children}
    </div>
  )
}
