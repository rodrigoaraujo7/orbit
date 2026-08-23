import { app } from "./app.ts"

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message)
  },
}

const health = await app.request("/health")
assert.equal(health.status, 200)
assert.equal(await health.json().then((body) => body.ok), true)
assert.ok(health.headers.get("x-content-type-options") === "nosniff", "nosniff")
assert.ok(health.headers.get("x-frame-options"), "frame options")

const missing = await app.request("/nope")
assert.equal(missing.status, 404)

console.log("app.check.ts: ok")
