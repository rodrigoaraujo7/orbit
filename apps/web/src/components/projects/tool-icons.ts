import { createElement, type ComponentType } from "react"
import {
  SiAnthropic,
  SiBetterstack,
  SiCloudflare,
  SiDatadog,
  SiFirebase,
  SiFlydotio,
  SiGoogleanalytics,
  SiMercadopago,
  SiMongodb,
  SiNetlify,
  SiNewrelic,
  SiPaypal,
  SiPlanetscale,
  SiPlausibleanalytics,
  SiPosthog,
  SiRailway,
  SiRender,
  SiResend,
  SiSentry,
  SiStripe,
  SiSupabase,
  SiUmami,
  SiVercel,
} from "@icons-pack/react-simple-icons"
import {
  Cloud,
  Database,
  Hash,
  Mail,
  MessageSquare,
  Sparkles,
  Wrench,
} from "lucide-react"

export type ToolIcon = ComponentType<{ className?: string }>

/**
 * simple-icons dropped several logos over trademark policy (AWS, Neon, Twilio,
 * SendGrid, Slack, OpenAI) — those fall back to a generic lucide icon.
 */
const TOOL_ICON: Record<string, ToolIcon> = {
  vercel: SiVercel,
  netlify: SiNetlify,
  railway: SiRailway,
  render: SiRender,
  fly: SiFlydotio,
  cloudflare: SiCloudflare,
  aws: Cloud,

  supabase: SiSupabase,
  neon: Database,
  planetscale: SiPlanetscale,
  mongodb: SiMongodb,
  firebase: SiFirebase,

  sentry: SiSentry,
  datadog: SiDatadog,
  betterstack: SiBetterstack,
  newrelic: SiNewrelic,

  posthog: SiPosthog,
  plausible: SiPlausibleanalytics,
  umami: SiUmami,
  ga: SiGoogleanalytics,

  resend: SiResend,
  twilio: MessageSquare,
  sendgrid: Mail,
  slack: Hash,

  stripe: SiStripe,
  mercadopago: SiMercadopago,
  paypal: SiPaypal,

  openai: Sparkles,
  anthropic: SiAnthropic,
}

/**
 * Tool icon by catalog id (`Wrench` as the fallback, used by tools registered
 * as "Outra").
 *
 * Uses `createElement` instead of JSX because assigning the component to a
 * local variable inside the render trips the `react-hooks/static-components` lint.
 */
export function ToolIcon({ id, className }: { id: string; className?: string }) {
  return createElement(TOOL_ICON[id] ?? Wrench, { className })
}
