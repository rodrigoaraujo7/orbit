import { z } from "zod"
import { validation } from "./messages.ts"

export const githubConnectInput = z.object({
  token: z.string(validation.enterGithubToken).trim().min(1, validation.enterGithubToken),
})

export const githubProjectInput = z.object({
  projectId: z.string().trim().min(1),
})

export const githubRunsInput = githubProjectInput.extend({
  branch: z.string().trim().optional(),
  limit: z.number().int().min(1).max(50).optional(),
})
