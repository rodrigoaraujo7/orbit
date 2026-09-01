import { describe, expect, it } from 'vitest'
import { CURRENCIES, DEFAULT_CURRENCY } from './currency.ts'

describe('currency', () => {
  it('defaults to BRL and lists ISO codes', () => {
    expect(DEFAULT_CURRENCY).toBe('BRL')
    expect(CURRENCIES).toContain('BRL')
    expect(CURRENCIES).toContain('USD')
    expect(CURRENCIES).toContain('EUR')
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length)
  })
})
