"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react"
import { cn } from "ui/utils"

export function Reveal({
  as: Tag = "div",
  children,
  className,
  delay = 0,
  immediate = false,
}: {
  as?: "div" | "li"
  children: ReactNode
  className?: string
  delay?: number
  immediate?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    /* v8 ignore next -- ref is set before the effect runs */
    if (!node || immediate) return
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [immediate])

  const style: CSSProperties | undefined =
    delay > 0
      ? immediate
        ? { animationDelay: `${delay}ms` }
        : { transitionDelay: `${delay}ms` }
      : undefined

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement & HTMLLIElement>}
      className={cn(
        "marketing-reveal",
        immediate && "marketing-reveal-immediate",
        shown && "marketing-reveal-in",
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  )
}
