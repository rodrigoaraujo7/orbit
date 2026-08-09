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
 * O simple-icons removeu vários logos por política de marca registrada
 * (AWS, Neon, Twilio, SendGrid, Slack, OpenAI) — esses caem num ícone
 * genérico do lucide.
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
 * Ícone da ferramenta pelo id do catálogo (`Wrench` como fallback, usado
 * pelas ferramentas cadastradas como "Outra").
 *
 * Usa `createElement` em vez de JSX porque atribuir o componente a uma
 * variável local dentro do render dispara o lint `react-hooks/static-components`.
 */
export function ToolIcon({ id, className }: { id: string; className?: string }) {
  return createElement(TOOL_ICON[id] ?? Wrench, { className })
}
