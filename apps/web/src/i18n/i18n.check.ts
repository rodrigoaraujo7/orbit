/**
 * Self-check of catalogs, language switching, and locale-aware formatters.
 * Run with: pnpm check:i18n
 */
import { authErrorMessage } from "../lib/auth-errors.ts"
import { formatCurrency, formatDate } from "../lib/format.ts"
import i18n, { DEFAULT_LOCALE, getLocale } from "./index.ts"
import enUS from "./en-US.json" with { type: "json" }
import ptBR from "./pt-BR.json" with { type: "json" }

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`expected ${e}, got ${a}`)
  },
}

function flatten(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

assert.equal(DEFAULT_LOCALE, "en-US")
assert.deepEqual(flatten(enUS).sort(), flatten(ptBR).sort())

await i18n.changeLanguage("en-US")
assert.equal(getLocale(), "en-US")
assert.equal(i18n.t("nav.projects"), "Projects")
assert.equal(i18n.t("common.deleteWord"), "delete")
assert.equal(i18n.t("auth.signInTo"), "Sign in to ")
assert.equal(
  authErrorMessage({ code: "USER_ALREADY_EXISTS" }, "fallback"),
  "This email is already in use",
)
assert.equal(authErrorMessage({}, "fallback"), "fallback")
assert.equal(i18n.t("common.secretCount", { count: 1 }), "1 secret")
assert.equal(i18n.t("common.secretCount", { count: 2 }), "2 secrets")
assert.equal(i18n.t("projects.count", { count: 1 }), "1 registered project.")
assert.equal(i18n.t("projects.count", { count: 2 }), "2 registered projects.")
assert.equal(formatDate("2026-09-05"), "09/05/2026")
assert.equal(formatCurrency(18000.5, "USD"), "$18,000.50")
assert.equal(formatCurrency(18000.5, "BRL"), "R$18,000.50")

await i18n.changeLanguage("pt-BR")
assert.equal(getLocale(), "pt-BR")
assert.equal(i18n.t("nav.projects"), "Projetos")
assert.equal(i18n.t("common.deleteWord"), "excluir")
assert.equal(i18n.t("auth.signInTo"), "Entrar em ")
assert.equal(
  authErrorMessage({ code: "USER_ALREADY_EXISTS" }, "fallback"),
  "Este e-mail já está em uso",
)
assert.equal(authErrorMessage({}, "fallback"), "fallback")
assert.equal(i18n.t("common.secretCount", { count: 1 }), "1 segredo")
assert.equal(i18n.t("common.secretCount", { count: 2 }), "2 segredos")
assert.equal(i18n.t("projects.secretsEnv"), "Segredos (env)")
assert.equal(i18n.t("projects.count", { count: 1 }), "1 projeto cadastrado.")
assert.equal(i18n.t("projects.count", { count: 2 }), "2 projetos cadastrados.")
assert.equal(formatDate("2026-09-05"), "05/09/2026")
assert.equal(formatCurrency(18000.5, "BRL"), "R$ 18.000,50")
assert.equal(formatCurrency(18000.5, "USD"), "US$ 18.000,50")

await i18n.changeLanguage("en-US")
assert.equal(getLocale(), "en-US")
assert.equal(formatDate("2026-09-05"), "09/05/2026")

console.log("i18n: all checks passed")
