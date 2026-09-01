export const DEFAULT_CURRENCY = 'BRL'

export const CURRENCIES = [
  'BRL',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'CHF',
  'JPY',
  'CNY',
  'ARS',
  'MXN',
  'CLP',
  'COP',
  'PEN',
  'UYU',
  'INR',
  'ZAR',
  'AED',
  'SGD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'ILS',
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]
