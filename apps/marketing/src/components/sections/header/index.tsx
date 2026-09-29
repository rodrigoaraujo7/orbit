"use client"

import { Languages } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { buttonVariants } from "ui/button"
import { cn } from "ui/utils"
import type { Dictionary, Locale } from "@/i18n"
import { signInUrl, signUpUrl } from "@/lib/site"

const NAV = [
  ["#product", "product"],
  ["#pains", "pains"],
  ["#features", "features"],
  ["#how", "how"],
  ["#security", "security"],
  ["#faq", "faq"],
] as const

const LOCALES = [
  ["en", "english"],
  ["pt-BR", "portuguese"],
] as const

export function Header({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const [languageOpen, setLanguageOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()
  const headerRef = useRef<HTMLElement>(null)
  const languageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!languageOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!languageRef.current?.contains(event.target as Node)) setLanguageOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [languageOpen])

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const syncHeight = () => {
      document.documentElement.style.setProperty(
        "--marketing-header-height",
        `${header.offsetHeight}px`,
      )
    }
    syncHeight()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(syncHeight)
    observer.observe(header)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty("--marketing-header-height")
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-20 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-out motion-reduce:transition-none",
        scrolled
          ? "border-border/70 bg-background/80 backdrop-blur-md"
          : "border-transparent bg-transparent backdrop-blur-[0px]",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <a href={`/${locale}`} className="font-heading text-lg italic tracking-wide">
          {dictionary.meta.title}
        </a>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav
            aria-label={dictionary.nav.product}
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {NAV.map(([href, key]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {dictionary.nav[key]}
              </a>
            ))}
          </nav>
          <div
            role="separator"
            aria-orientation="vertical"
            className="h-4 w-px shrink-0 bg-border"
          />
          <div className="flex items-center gap-1">
            <div className="relative" ref={languageRef}>
              <button
                type="button"
                aria-label={dictionary.nav.language}
                aria-haspopup="menu"
                aria-expanded={languageOpen}
                aria-controls={menuId}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "rounded-full",
                )}
                onClick={() => setLanguageOpen((open) => !open)}
              >
                <Languages />
              </button>
              {languageOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  aria-label={dictionary.nav.language}
                  className="absolute top-full right-0 z-30 mt-2 flex min-w-36 flex-col gap-1 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
                >
                  {LOCALES.map(([code, key]) => {
                    const current = code === locale
                    return (
                      <a
                        key={code}
                        role="menuitem"
                        href={`/${code}`}
                        hrefLang={code}
                        lang={code}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "block rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-muted",
                          current && "bg-muted font-medium",
                        )}
                      >
                        {dictionary.nav[key]}
                      </a>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <a href={signInUrl()} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              {dictionary.nav.signIn}
            </a>
            <a href={signUpUrl()} className={cn(buttonVariants({ size: "sm" }))}>
              {dictionary.nav.getStarted}
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
