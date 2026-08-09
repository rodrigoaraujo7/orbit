export const DEFAULT_CURRENCY = "BRL"

// Curadoria das moedas mais comuns pra cliente internacional de freelancer —
// não é a lista ISO 4217 inteira (Intl.supportedValuesOf("currency") tem
// 160+), pra não virar uma lista gigante sem busca no dropdown.
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

// Intl.DisplayNames traduz o nome da moeda pro pt-BR nativamente — sem
// manter um dicionário de tradução na mão.
const currencyNames = new Intl.DisplayNames(["pt-BR"], { type: "currency" })

export const currencyOptions = CURRENCIES.map((code) => ({
  value: code,
  label: `${code} · ${currencyNames.of(code)}`,
}))
