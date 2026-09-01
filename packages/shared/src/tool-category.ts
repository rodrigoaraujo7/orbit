import { z } from "zod"

export const TOOL_CATEGORIES = [
  "deploy",
  "database",
  "observability",
  "analytics",
  "communication",
  "payments",
  "ai",
  "other",
] as const

export const toolCategorySchema = z.enum(TOOL_CATEGORIES)
export type ToolCategory = z.infer<typeof toolCategorySchema>

export const TOOL_CATEGORY_LABEL: Record<ToolCategory, string> = {
  deploy: "Deploy & Hosting",
  database: "Banco de dados",
  observability: "Observabilidade",
  analytics: "Métricas & Analytics",
  communication: "Comunicação",
  payments: "Pagamentos",
  ai: "IA",
  other: "Outra",
}
