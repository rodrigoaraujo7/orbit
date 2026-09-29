import enUS from "./en-US.json"
import ptBR from "./pt-BR.json"

export const LOCALES = ["en", "pt-BR"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"

const DICTIONARIES = {
  en: enUS,
  "pt-BR": ptBR,
} satisfies Record<Locale, typeof enUS>

export type Dictionary = (typeof DICTIONARIES)["en"]

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

type RankedTag = { tag: string; q: number }

function rankedTags(header: string): RankedTag[] {
  return header
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";")
      const qParam = params.find((param) => param.trim().toLowerCase().startsWith("q="))
      const q = qParam ? Number(qParam.trim().slice(2)) : 1
      return { tag: rawTag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((item) => item.tag.length > 0 && item.q > 0)
    .sort((a, b) => b.q - a.q)
}

function matchLocale(tag: string): Locale | null {
  if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR"
  if (tag === "en" || tag.startsWith("en-")) return "en"
  return null
}

/** Picks a URL locale from an Accept-Language header. Unknown languages fall back to English. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage?.trim()) return DEFAULT_LOCALE
  for (const { tag } of rankedTags(acceptLanguage)) {
    const locale = matchLocale(tag)
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}
