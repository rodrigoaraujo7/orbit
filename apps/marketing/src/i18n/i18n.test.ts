import { describe, expect, it } from "vitest"
import enUS from "./en-US.json" with { type: "json" }
import ptBR from "./pt-BR.json" with { type: "json" }
import { DEFAULT_LOCALE, getDictionary, isLocale, LOCALES, negotiateLocale } from "./index"

function flatten(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

describe("i18n catalogs", () => {
  it("keeps en-US and pt-BR key trees in sync", () => {
    expect(DEFAULT_LOCALE).toBe("en")
    expect(LOCALES).toEqual(["en", "pt-BR"])
    expect(flatten(enUS).sort()).toEqual(flatten(ptBR).sort())
  })

  it("returns the catalog for a locale and rejects unknown ones", () => {
    expect(isLocale("en")).toBe(true)
    expect(isLocale("pt-BR")).toBe(true)
    expect(isLocale("fr")).toBe(false)
    expect(isLocale("")).toBe(false)
    expect(getDictionary("en").meta.title).toBe("Orbit")
    expect(getDictionary("pt-BR").nav.signIn).toBe("Entrar")
  })
})

describe("negotiateLocale", () => {
  it("defaults when the header is missing or empty", () => {
    expect(negotiateLocale(null)).toBe("en")
    expect(negotiateLocale(undefined)).toBe("en")
    expect(negotiateLocale("")).toBe("en")
    expect(negotiateLocale("   ")).toBe("en")
  })

  it("picks the highest-quality supported language", () => {
    expect(negotiateLocale("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt-BR")
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en")
    expect(negotiateLocale("fr-FR,pt;q=0.8,en;q=0.5")).toBe("pt-BR")
    expect(negotiateLocale("pt")).toBe("pt-BR")
    expect(negotiateLocale("PT-br")).toBe("pt-BR")
    expect(negotiateLocale("fr-FR,de;q=0.9")).toBe("en")
    expect(negotiateLocale("*;q=0.1,en;q=0")).toBe("en")
    expect(negotiateLocale("en;q=nope")).toBe("en")
    expect(negotiateLocale(",en-GB")).toBe("en")
  })
})
