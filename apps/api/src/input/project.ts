import { z } from "zod"
import {
  billingCycleSchema,
  dealKindSchema,
  payerSchema,
  projectStatusSchema,
  TOOL_CATEGORIES,
  workflowStatusSchema,
} from "shared"
import { validation } from "./messages.ts"

/** Same owner/repo check as the UI `parseRepo` path (after toProject()). */
const repoFullName = /^[\w.-]+\/[\w.-]+$/

const secretInput = z.object({
  key: z.string(validation.enterKey).trim().min(1, validation.enterKey),
  // Empty is the keep-existing ciphertext sentinel on project update.
  value: z.string(),
})

const billingInput = z.object({
  amount: z.number().min(0, validation.negativeAmount),
  cycle: billingCycleSchema,
  nextInvoice: z.string().trim(),
  payer: payerSchema,
  currency: z.string().trim().min(1),
})

function refineTool(
  tool: { billing?: { amount: number; nextInvoice: string } },
  ctx: z.RefinementCtx,
) {
  if (tool.billing && tool.billing.amount > 0 && !tool.billing.nextInvoice) {
    ctx.addIssue({
      code: "custom",
      path: ["billing", "nextInvoice"],
      message: validation.enterInvoiceDate,
    })
  }
}

export const toolInput = z
  .object({
    id: z.string(validation.selectTool).trim().min(1, validation.selectTool),
    name: z.string(validation.enterToolName).trim().min(2, validation.enterToolName),
    category: z.enum(TOOL_CATEGORIES, validation.selectCategory),
    account: z.string().optional(),
    billing: billingInput.optional(),
    secrets: z.array(secretInput),
  })
  .superRefine(refineTool)

export type ToolInput = z.infer<typeof toolInput>

const commentInput = z.object({
  id: z.string().trim().min(1),
  author: z.string().trim().min(1),
  createdAt: z.string().trim().min(1),
  body: z.string().trim().min(1),
})

const repoInput = z.object({
  fullName: z.string().regex(repoFullName, validation.repoFormat),
  url: z.string(),
  workflow: workflowStatusSchema,
})

function refineProject(
  values: { deal: { kind: string; amount: number; installments?: number } },
  ctx: z.RefinementCtx,
) {
  if (values.deal.kind === "installment" && values.deal.amount > 0) {
    const n = values.deal.installments
    if (typeof n !== "number" || !Number.isInteger(n) || n < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["deal", "installments"],
        message: validation.minInstallments,
      })
    }
  }
}

const projectFields = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string(validation.minChars).trim().min(2, validation.minChars),
  clientId: z.string(validation.selectContact).trim().min(1, validation.selectContact),
  status: projectStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  deal: z.object({
    kind: dealKindSchema,
    amount: z.number().min(0, validation.negativeAmount),
    installments: z.number().optional(),
    currency: z.string().trim().min(1),
  }),
  tools: z.array(toolInput),
  repo: repoInput.nullable(),
  description: z.string().optional(),
  comments: z.array(commentInput).optional(),
})

export const projectInput = projectFields.superRefine(refineProject)
export type ProjectInput = z.infer<typeof projectInput>

export const projectUpdateInput = projectFields.required({ id: true }).superRefine(refineProject)

export const projectIdInput = z.object({
  id: z.string().trim().min(1),
})

export const projectMoveInput = projectIdInput.extend({
  status: projectStatusSchema,
  index: z.number().int().nonnegative(),
})
