import { allowAttempt, resetAttempts } from "./rate-limit.ts"

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`expected ${String(expected)}, got ${String(actual)}`)
  },
}

resetAttempts()
assert.equal(allowAttempt("u1", 2, 1000, 0), true)
assert.equal(allowAttempt("u1", 2, 1000, 1), true)
assert.equal(allowAttempt("u1", 2, 1000, 2), false)
assert.equal(allowAttempt("u2", 2, 1000, 2), true)
assert.equal(allowAttempt("u1", 2, 1000, 1001), true)

console.log("rate-limit.check.ts: ok")
