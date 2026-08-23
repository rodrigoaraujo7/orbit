import { randomBytes } from "node:crypto"
import {
  generateDek,
  openSecret,
  parseMasterKey,
  sealSecret,
  secretAad,
  unwrapDek,
  wrapDek,
} from "./envelope.ts"

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`expected ${String(expected)}, got ${String(actual)}`)
  },
  throws(fn: () => void) {
    try {
      fn()
    } catch {
      return
    }
    throw new Error("expected throw")
  },
}

const master = parseMasterKey(randomBytes(32).toString("hex"))
const dek = generateDek()
const wrapped = wrapDek(master, dek)
assert.equal(unwrapDek(master, wrapped).equals(dek), true)

const aad = secretAad("user-a", "cred-1", 1)
const sealed = sealSecret(dek, "sk_live_abc", aad)
assert.equal(openSecret(dek, sealed, aad), "sk_live_abc")

assert.throws(() => openSecret(dek, sealed, secretAad("user-b", "cred-1", 1)))
assert.throws(() => openSecret(dek, sealed, secretAad("user-a", "cred-2", 1)))
assert.throws(() => unwrapDek(randomBytes(32), wrapped))

console.log("envelope.check.ts: ok")
