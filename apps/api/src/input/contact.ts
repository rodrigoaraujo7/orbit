import { z } from "zod"
import { validation } from "./messages.ts"

function refineEmail(values: { email?: string }, ctx: z.RefinementCtx) {
  if (values.email && !z.email().safeParse(values.email).success) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: validation.emailInvalid,
    })
  }
}

const contactFields = {
  name: z.string().trim().min(2, validation.minChars),
  email: z.string().trim().optional(),
  phone: z.string().trim().min(1, validation.enterPhone),
  company: z.string().trim().min(1, validation.enterCompany),
}

export const contactInput = z.object(contactFields).superRefine(refineEmail)

export const contactIdInput = z.object({
  id: z.string().trim().min(1),
})

export const contactUpdateInput = z
  .object({
    ...contactFields,
    id: z.string().trim().min(1),
  })
  .superRefine(refineEmail)
