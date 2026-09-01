import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './auth-errors.ts'

describe('authErrorMessage', () => {
  it('maps known codes, 429 and fallbacks', () => {
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD' }, 'x')).not.toBe('x')
    expect(authErrorMessage({ status: 429 }, 'x')).not.toBe('x')
    expect(authErrorMessage({ code: 'UNKNOWN' }, 'fallback')).toBe('fallback')
    expect(authErrorMessage({}, 'fallback')).toBe('fallback')
  })
})
