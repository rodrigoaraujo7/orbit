import { z } from "zod"
import { TOOL_CATEGORIES } from "shared"
import { validation } from "./messages.ts"

export const customToolInput = z.object({
  name: z.string().trim().min(2, validation.minChars),
  category: z.enum(TOOL_CATEGORIES, validation.selectCategory),
})

export const customToolIdInput = z.object({
  id: z.string().trim().min(1),
})

export const customToolUpdateInput = customToolInput.extend({
  id: z.string().trim().min(1),
})
