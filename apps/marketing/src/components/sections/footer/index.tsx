import { Reveal } from "@/components/reveal"
import type { Dictionary, Locale } from "@/i18n"

export function Footer({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border/70">
      <Reveal className="page-wrap flex flex-col gap-3 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>{dictionary.footer.tagline}</p>
        <p>
          <span lang={locale}>© {year} </span>
          {dictionary.footer.rights}
        </p>
      </Reveal>
    </footer>
  )
}
