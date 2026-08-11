export const DEFAULT_CURRENCY = "BRL"

// Curated set of the currencies a freelancer's international clients actually
// use — not the whole ISO 4217 list (Intl.supportedValuesOf("currency") has
// 160+), so the dropdown doesn't become a huge list with no search.
export const CURRENCIES = [
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "CHF",
  "JPY",
  "CNY",
  "ARS",
  "MXN",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "INR",
  "ZAR",
  "AED",
  "SGD",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "ILS",
] as const

// Intl.DisplayNames localizes the currency name to pt-BR natively — no
// hand-maintained translation dictionary.
const currencyNames = new Intl.DisplayNames(["pt-BR"], { type: "currency" })

export const currencyOptions = CURRENCIES.map((code) => ({
  value: code,
  label: `${code} · ${currencyNames.of(code)}`,
}))
