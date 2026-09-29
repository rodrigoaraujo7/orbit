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

export function Header({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const other: Locale = locale === "en" ? "pt-BR" : "en"
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <a href={`/${locale}`} className="font-heading text-lg italic tracking-wide">
          {dictionary.meta.title}
        </a>
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
        <div className="flex items-center gap-2">
          <a
            href={`/${other}`}
            hrefLang={other}
            lang={other}
            aria-label={dictionary.nav.language}
            className="px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {other === "en" ? dictionary.nav.english : dictionary.nav.portuguese}
          </a>
          <a href={signInUrl()} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {dictionary.nav.signIn}
          </a>
          <a href={signUpUrl()} className={cn(buttonVariants({ size: "sm" }))}>
            {dictionary.nav.getStarted}
          </a>
        </div>
      </div>
    </header>
  )
}
