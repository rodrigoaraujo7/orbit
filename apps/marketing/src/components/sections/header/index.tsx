"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Check, Languages, Menu } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Button, buttonVariants } from "ui/button"
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "ui/drawer"
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

const drawerLinkClass =
  "flex h-9 items-center justify-start rounded-lg px-3 text-left text-sm font-medium text-sidebar-foreground/65 outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"

const languageItemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"

function LanguageMenu({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={dictionary.nav.language}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "rounded-full")}
        onClick={() => setOpen((value) => !value)}
      >
        <Languages />
      </button>
      {open ? (
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
  )
}

function DrawerLanguageMenu({
  dictionary,
  locale,
  onNavigate,
}: {
  dictionary: Dictionary
  locale: Locale
  onNavigate: () => void
}) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left outline-none transition-colors",
          "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        )}
      >
        <Languages className="size-4 shrink-0" />
        <span className="truncate text-sm font-medium text-sidebar-foreground">
          {dictionary.nav.language}
        </span>
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          side="top"
          align="start"
          sideOffset={10}
          className="z-[60] w-[var(--anchor-width)] min-w-56"
        >
          <MenuPrimitive.Popup className="w-full rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <p className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Languages className="size-3.5" />
              {dictionary.nav.language}
            </p>
            {LOCALES.map(([code, key]) => (
              <MenuPrimitive.Item
                key={code}
                className={languageItemClass}
                render={<a href={`/${code}`} hrefLang={code} lang={code} />}
                onClick={onNavigate}
              >
                <span className="flex-1">{dictionary.nav[key]}</span>
                {code === locale && <Check className="size-3.5 text-primary" />}
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}

export function Header({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

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

  const closeMenu = () => setMenuOpen(false)

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
      <div className="page-wrap flex items-center gap-x-6 px-6 py-4">
        <a href={`/${locale}`} className="font-heading text-lg italic tracking-wide">
          {dictionary.meta.title}
        </a>
        <div className="ml-auto hidden items-center gap-x-4 lg:flex">
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
            <LanguageMenu dictionary={dictionary} locale={locale} />
            <a href={signInUrl()} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              {dictionary.nav.signIn}
            </a>
            <a href={signUpUrl()} className={cn(buttonVariants({ size: "sm" }))}>
              {dictionary.nav.getStarted}
            </a>
          </div>
        </div>
        <Drawer open={menuOpen} onOpenChange={setMenuOpen} swipeDirection="right">
          <div className="ml-auto lg:hidden">
            <DrawerTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={dictionary.nav.openMenu} />
              }
            >
              <Menu />
            </DrawerTrigger>
          </div>
          <DrawerContent className="w-60 bg-sidebar/40 text-sidebar-foreground after:hidden">
            <DrawerTitle className="sr-only">{dictionary.nav.menu}</DrawerTitle>
            <nav aria-label={dictionary.nav.product} className="flex flex-1 flex-col gap-0.5 p-2">
              {NAV.map(([href, key]) => (
                <a key={href} href={href} className={drawerLinkClass} onClick={closeMenu}>
                  {dictionary.nav[key]}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t p-2">
              <DrawerLanguageMenu dictionary={dictionary} locale={locale} onNavigate={closeMenu} />
              <a
                href={signUpUrl()}
                className={cn(buttonVariants({ size: "sm" }), "w-full justify-start text-left")}
                onClick={closeMenu}
              >
                {dictionary.nav.getStarted}
              </a>
              <a
                href={signInUrl()}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-start text-left",
                )}
                onClick={closeMenu}
              >
                {dictionary.nav.signIn}
              </a>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  )
}
