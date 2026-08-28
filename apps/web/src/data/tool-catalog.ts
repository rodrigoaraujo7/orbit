export type ToolCategory =
  | "deploy"
  | "database"
  | "observability"
  | "analytics"
  | "communication"
  | "payments"
  | "ai"
  | "other"

/** Group order in the select. `other` always last. */
export const TOOL_CATEGORY_ORDER: ToolCategory[] = [
  "deploy",
  "database",
  "observability",
  "analytics",
  "communication",
  "payments",
  "ai",
  "other",
]

export type CatalogTool = {
  id: string
  name: string
  category: ToolCategory
}

/** Id of the "Outra" option — unlocks the free-text name field. */
export const OTHER_TOOL_ID = "other"

// Data only: icons live in components/projects/tool-icons.ts so this module
// stays importable outside the browser (e.g. the schema self-check).
export const toolCatalog: CatalogTool[] = [
  { id: "vercel", name: "Vercel", category: "deploy" },
  { id: "netlify", name: "Netlify", category: "deploy" },
  { id: "railway", name: "Railway", category: "deploy" },
  { id: "render", name: "Render", category: "deploy" },
  { id: "fly", name: "Fly.io", category: "deploy" },
  { id: "cloudflare", name: "Cloudflare", category: "deploy" },
  { id: "aws", name: "AWS", category: "deploy" },

  { id: "supabase", name: "Supabase", category: "database" },
  { id: "neon", name: "Neon", category: "database" },
  { id: "planetscale", name: "PlanetScale", category: "database" },
  { id: "mongodb", name: "MongoDB", category: "database" },
  { id: "firebase", name: "Firebase", category: "database" },

  { id: "sentry", name: "Sentry", category: "observability" },
  { id: "datadog", name: "Datadog", category: "observability" },
  { id: "betterstack", name: "Better Stack", category: "observability" },
  { id: "newrelic", name: "New Relic", category: "observability" },

  { id: "posthog", name: "PostHog", category: "analytics" },
  { id: "plausible", name: "Plausible", category: "analytics" },
  { id: "umami", name: "Umami", category: "analytics" },
  { id: "ga", name: "Google Analytics", category: "analytics" },

  { id: "resend", name: "Resend", category: "communication" },
  { id: "twilio", name: "Twilio", category: "communication" },
  { id: "sendgrid", name: "SendGrid", category: "communication" },
  { id: "slack", name: "Slack", category: "communication" },

  { id: "stripe", name: "Stripe", category: "payments" },
  { id: "mercadopago", name: "Mercado Pago", category: "payments" },
  { id: "paypal", name: "PayPal", category: "payments" },

  { id: "openai", name: "OpenAI", category: "ai" },
  { id: "anthropic", name: "Anthropic", category: "ai" },

  { id: OTHER_TOOL_ID, name: "Outra", category: "other" },
]

const byId = new Map(toolCatalog.map((tool) => [tool.id, tool]))

export function findCatalogTool(id: string): CatalogTool | undefined {
  return byId.get(id)
}

/** Tools of a category, in the order they appear in the catalog. */
export function toolsByCategory(category: ToolCategory): CatalogTool[] {
  return toolCatalog.filter((tool) => tool.category === category)
}
