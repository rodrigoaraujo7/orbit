"use client"

import { useEffect, useState, type PointerEvent } from "react"
import { KeyRound, Mail, Shield, type LucideIcon } from "lucide-react"
import { cn } from "ui/utils"
import { Reveal } from "@/components/reveal"
import type { Dictionary } from "@/i18n"
import { applyPointerVars, clearPointerVars, pointerVars } from "../features/pointer"
import { usesScrollActivation } from "../features/scroll"
import {
  SECURITY_CYCLE_MS,
  SECURITY_KEYS,
  focusSecurityTab,
  focusStaysInside,
  securityKeyFromKey,
  stepSecurityKey,
  type SecurityKey,
} from "./cycle"
import { SecurityStage } from "./stage"

const ICONS = {
  isolation: Shield,
  encryption: KeyRound,
  emailCode: Mail,
} satisfies Record<SecurityKey, LucideIcon>

const MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(MOTION_QUERY)
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return reduced
}

function onStageEnter(event: PointerEvent<HTMLElement>) {
  if (usesScrollActivation()) return
  event.currentTarget.dataset.active = ""
}

function onStageMove(event: PointerEvent<HTMLElement>) {
  const node = event.currentTarget
  applyPointerVars(
    node.style,
    pointerVars(node.getBoundingClientRect(), event.clientX, event.clientY),
  )
}

function onStageLeave(event: PointerEvent<HTMLElement>) {
  const node = event.currentTarget
  clearPointerVars(node.style)
  if (usesScrollActivation() || event.pointerType === "touch") return
  delete node.dataset.active
}

export function Security({ dictionary }: { dictionary: Dictionary }) {
  const [selected, setSelected] = useState<SecurityKey>("isolation")
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const playing = !paused && !reduced

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setSelected((current) => stepSecurityKey(current, 1))
    }, SECURITY_CYCLE_MS)
    return () => window.clearInterval(id)
  }, [playing])

  return (
    <section id="security" className="security-section scroll-mt-24 border-t border-border/70">
      <div className="page-wrap px-6 py-20 md:py-28">
        <Reveal>
          <h2 className="max-w-2xl font-heading text-4xl tracking-tight md:text-5xl">
            {dictionary.security.title}
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">{dictionary.security.subtitle}</p>
        </Reveal>

        <div
          className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-stretch"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(event) => {
            if (focusStaysInside(event.currentTarget, event.relatedTarget)) return
            setPaused(false)
          }}
        >
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={dictionary.security.title}
            className="order-2 flex flex-col gap-3 lg:order-1"
            onKeyDown={(event) => {
              const next = securityKeyFromKey(selected, event.key)
              if (!next) return
              event.preventDefault()
              setSelected(next)
              focusSecurityTab(event.currentTarget, next)
            }}
          >
            {SECURITY_KEYS.map((key, index) => {
              const Icon = ICONS[key]
              const item = dictionary.security[key]
              const active = key === selected
              return (
                <button
                  key={key}
                  id={`security-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`security-panel-${selected}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelected(key)}
                  onPointerEnter={() => setSelected(key)}
                  className={cn(
                    "security-card group cursor-pointer rounded-4xl px-5 py-5 text-left ring-1 ring-transparent",
                    !active && "ring-foreground/10 hover:bg-card/70 hover:ring-foreground/20",
                  )}
                >
                  <span className="flex items-start gap-4">
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-2xl ring-1 transition-colors duration-300",
                        active
                          ? "bg-primary/15 text-primary ring-primary/30"
                          : "bg-foreground/5 text-muted-foreground ring-foreground/10",
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <h3 className="text-lg font-medium">{item.title}</h3>
                        <span
                          className={cn(
                            "font-heading text-2xl italic leading-none",
                            active ? "text-primary" : "text-muted-foreground/50",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </span>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                      {active ? (
                        <span className="mt-4 block h-0.5 overflow-hidden rounded-full bg-foreground/10">
                          <span
                            data-part="meter"
                            className={cn(
                              "block h-full w-full bg-primary",
                              playing ? "security-meter" : "scale-x-100",
                            )}
                            style={
                              playing ? { animationDuration: `${SECURITY_CYCLE_MS}ms` } : undefined
                            }
                          />
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <article
            role="tabpanel"
            data-scene={selected}
            id={`security-panel-${selected}`}
            aria-labelledby={`security-tab-${selected}`}
            onPointerEnter={onStageEnter}
            onPointerMove={onStageMove}
            onPointerLeave={onStageLeave}
            className="bento-card group relative isolate order-1 flex min-h-[28rem] flex-col overflow-hidden rounded-4xl bg-card ring-1 ring-foreground/10 lg:order-2 lg:min-h-[36rem]"
          >
            <div aria-hidden className="bento-spotlight" />
            <div aria-hidden className="security-grid pointer-events-none absolute inset-0" />
            <SecurityStage kind={selected} />
          </article>
        </div>
      </div>
    </section>
  )
}
