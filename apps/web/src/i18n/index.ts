import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enUS from "./en-US.json" with { type: "json" }
import ptBR from "./pt-BR.json" with { type: "json" }

export const SUPPORTED_LOCALES = ["en-US", "pt-BR"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en-US"

const STORAGE_KEY = "locale"

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function getLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isLocale(stored)) return stored
  } catch {
    // private mode / storage blocked
  }
  return DEFAULT_LOCALE
}

function applyHtmlLang(locale: string) {
  if (typeof document === "undefined") return
  document.documentElement.lang = locale
}

export function setLocale(locale: Locale) {
  void i18n.changeLanguage(locale)
}

void i18n.use(initReactI18next).init({
  resources: {
    "en-US": { translation: enUS },
    "pt-BR": { translation: ptBR },
  },
  lng: readStoredLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
  returnNull: false,
})

applyHtmlLang(getLocale())

i18n.on("languageChanged", (lng) => {
  applyHtmlLang(lng)
  if (typeof window === "undefined" || !isLocale(lng)) return
  try {
    window.localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // ignore quota / private mode
  }
})

export default i18n
