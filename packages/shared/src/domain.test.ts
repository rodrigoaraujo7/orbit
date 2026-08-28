import { describe, expect, it } from "vitest"
import { AUDIT_ACTIONS, auditChangeSchema, auditModuleSchema } from "./audit.ts"
import {
  billingCycleSchema,
  dealKindSchema,
  invoiceStatusSchema,
  payerSchema,
  paymentMethodSchema,
  projectStatusSchema,
  workflowStatusSchema,
} from "./domain.ts"

describe("domain schemas", () => {
  it("accepts known enums and rejects unknowns", () => {
    expect(projectStatusSchema.safeParse("queued").success).toBe(true)
    expect(projectStatusSchema.safeParse("done").success).toBe(false)
    expect(projectStatusSchema.options).toHaveLength(5)
    expect(dealKindSchema.safeParse("upfront").success).toBe(true)
    expect(dealKindSchema.safeParse("installment").success).toBe(true)
    expect(billingCycleSchema.safeParse("one-off").success).toBe(true)
    expect(payerSchema.safeParse("me").success).toBe(true)
    expect(invoiceStatusSchema.safeParse("overdue").success).toBe(true)
    expect(paymentMethodSchema.safeParse("pix").success).toBe(true)
    expect(workflowStatusSchema.safeParse("success").success).toBe(true)
    expect(workflowStatusSchema.safeParse("running").success).toBe(true)
    expect(workflowStatusSchema.safeParse("none").success).toBe(true)
  })
})

describe("audit schemas", () => {
  it("validates modules, change rows and known actions", () => {
    expect(auditModuleSchema.safeParse("settings").success).toBe(true)
    expect(auditModuleSchema.safeParse("financial").success).toBe(false)
    expect(auditModuleSchema.safeParse("billing").success).toBe(false)
    expect(auditChangeSchema.safeParse({ field: "name", from: "a", to: "b" }).success).toBe(true)
    expect(auditChangeSchema.safeParse({ field: "name" }).success).toBe(false)
    expect(AUDIT_ACTIONS.includes("credential.reveal")).toBe(true)
    expect(AUDIT_ACTIONS).toContain("security.login")
  })
})
