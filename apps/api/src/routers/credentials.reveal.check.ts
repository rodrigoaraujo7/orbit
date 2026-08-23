/**
 * Reveal gates: 2FA, fresh session, durable attempt cap.
 * Run via pnpm --filter api check:crypto
 */
import { TRPCError } from "@trpc/server"
import { createTestDb, insertUser } from "../db/test-db.ts"
import { withUser } from "../db/with-user.ts"
import { recordRevealAttempt, requireRevealAccess, revealAttemptCount } from "./credentials.ts"

const assert = {
  equal(actual: unknown, expected: unknown, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  throwsCode(fn: () => void, code: string) {
    try {
      fn()
    } catch (error) {
      if (error instanceof TRPCError && error.code === code) return
      throw error
    }
    throw new Error(`expected ${code}`)
  },
}

assert.throwsCode(() => requireRevealAccess({ twoFactorEnabled: false }, new Date()), "FORBIDDEN")
assert.throwsCode(
  () => requireRevealAccess({ twoFactorEnabled: true }, new Date(Date.now() - 16 * 60 * 1000)),
  "FORBIDDEN",
)
requireRevealAccess({ twoFactorEnabled: true }, new Date())

const { db, client } = await createTestDb()
await insertUser(client, "user-a")

await withUser(db, "user-a", async (tx) => {
  for (let i = 0; i < 10; i++) {
    await recordRevealAttempt(tx, "user-a", "cred-1")
  }
  assert.equal(await revealAttemptCount(tx, "user-a"), 10, "10 attempts recorded")
  await recordRevealAttempt(tx, "user-a", "cred-1")
  assert.equal((await revealAttemptCount(tx, "user-a")) > 10, true, "11th exceeds limit")
})

await client.close()
console.log("credentials.reveal.check.ts: ok")
