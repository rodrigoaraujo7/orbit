"use client"

import { useEffect, useState } from "react"

export const PERSONA_INTERVAL_MS = 2400

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

export function PersonaRotator({
  prefix,
  personas,
  label,
}: {
  prefix: string
  personas: string[]
  label: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = setInterval(
      () => setIndex((current) => (current + 1) % personas.length),
      PERSONA_INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [personas.length])

  return (
    <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
      <span className="sr-only">{label}</span>
      <span aria-hidden>
        {prefix}{" "}
        <span
          key={index}
          data-testid="persona"
          className="inline-block text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
        >
          {personas[index]}
        </span>
      </span>
    </p>
  )
}
