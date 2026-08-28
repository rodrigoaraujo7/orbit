/**
 * Self-check of integer-cents money helpers.
 * Run with: pnpm --filter shared check
 */
import {
  fromCents,
  hasPositiveAmount,
  parseAmount,
  toCents,
} from "./money.ts"

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`expected ${String(expected)}, got ${String(actual)}`)
    }
  },
}

assert.equal(parseAmount(""), null)
assert.equal(parseAmount("abc"), null)
assert.equal(parseAmount("18000"), 18000)
assert.equal(parseAmount("18.000,50"), 18000.5)
assert.equal(parseAmount("0"), 0)
assert.equal(parseAmount("0,00"), 0)

assert.equal(parseAmount("18,000.50", "en-US"), 18000.5)
assert.equal(parseAmount("18000.50", "en-US"), 18000.5)
assert.equal(parseAmount("0.00", "en-US"), 0)
assert.equal(parseAmount("18.000,50", "en-US") === 18000.5, false)

assert.equal(hasPositiveAmount(""), false)
assert.equal(hasPositiveAmount("0"), false)
assert.equal(hasPositiveAmount("0,00"), false)
assert.equal(hasPositiveAmount("1"), true)
assert.equal(hasPositiveAmount("0,01"), true)
assert.equal(hasPositiveAmount("0.00", "en-US"), false)
assert.equal(hasPositiveAmount("0.01", "en-US"), true)

assert.equal(toCents(18.5), 1850n)
assert.equal(toCents(0), 0n)
assert.equal(toCents(18.005), 1801n)
assert.equal(fromCents(1850n), 18.5)
assert.equal(fromCents(toCents(99.99)), 99.99)

console.log("money.check.ts: ok")
