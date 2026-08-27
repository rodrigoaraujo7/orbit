/**
 * Self-check of shared domain enums.
 * Run with: pnpm --filter shared check
 */
import {
  billingCycleSchema,
  dealKindSchema,
  invoiceStatusSchema,
  payerSchema,
  paymentMethodSchema,
  projectStatusSchema,
} from "./domain.ts"
import { AUDIT_ACTIONS, auditModuleSchema } from "./audit.ts"

const assert = {
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message)
  },
}

assert.ok(projectStatusSchema.safeParse("queued").success, "queued is a status")
assert.ok(!projectStatusSchema.safeParse("done").success, "done is not a status")
assert.ok(dealKindSchema.safeParse("upfront").success, "upfront is a deal kind")
assert.ok(dealKindSchema.safeParse("installment").success, "installment is a deal kind")
assert.ok(billingCycleSchema.safeParse("one-off").success, "one-off is a cycle")
assert.ok(payerSchema.safeParse("me").success, "me is a payer")
assert.ok(invoiceStatusSchema.safeParse("overdue").success, "overdue is a status")
assert.ok(paymentMethodSchema.safeParse("pix").success, "pix is a method")
assert.ok(projectStatusSchema.options.length === 5, "five statuses")
assert.ok(auditModuleSchema.safeParse("settings").success, "settings is a module")
assert.ok(!auditModuleSchema.safeParse("financial").success, "financial is not a module")
assert.ok(!auditModuleSchema.safeParse("billing").success, "billing is not a module")
assert.ok(AUDIT_ACTIONS.includes("credential.reveal"), "reveal is a known action")

console.log("domain.check.ts: ok")
