"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "ui/utils"

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const node = ref.current
    /* v8 ignore next -- ref is set before the effect runs */
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setActive(true))
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setActive(true)
        observer.disconnect()
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <ol ref={ref} className={cn("how-steps", className)} data-active={active ? "true" : undefined}>
      {children}
    </ol>
  )
}
