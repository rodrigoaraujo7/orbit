import type { ToolCategory } from "./tool-catalog"

export type ProjectStatus = "em-desenvolvimento" | "fila" | "pausado" | "concluido"

/** Resultado do último run do GitHub Actions no repo do projeto. */
export type WorkflowStatus = "success" | "failure" | "running" | "none"

export type BillingCycle = "mensal" | "anual" | "avulso"

/** Quem arca com o custo da ferramenta. */
export type Payer = "eu" | "cliente"

export type ToolBilling = {
  amount: number
  cycle: BillingCycle
  /** Data da fatura, formato "YYYY-MM-DD" (o que o <input type="date"> devolve). */
  nextInvoice: string
  payer: Payer
}

/**
 * ponytail: secret em texto puro só porque o app ainda é 100% front com
 * estado em memória. Quando a API entrar: criptografar at-rest, nunca logar,
 * e não devolver o valor pro front depois de salvo.
 */
export type Secret = {
  key: string
  value: string
}

export type Tool = {
  /** Id do catálogo em tool-catalog.ts, ou "outra" se for fora dele. */
  id: string
  name: string
  category: ToolCategory
  /** Conta/login usado pra acessar essa ferramenta neste projeto. */
  account?: string
  /** Presente se — e somente se — a ferramenta é paga. */
  billing?: ToolBilling
  secrets: Secret[]
}

export type DealKind = "gratis" | "a-vista" | "parcelado"

/** Valor fechado com o cliente. `amount`/`installments` dependem do `kind`. */
export type Deal = {
  kind: DealKind
  amount?: number
  installments?: number
}

export type Project = {
  id: string
  name: string
  /** Contato principal do cliente. */
  client: string
  status: ProjectStatus
  deal: Deal
  tools: Tool[]
  repo: {
    fullName: string
    url: string
    workflow: WorkflowStatus
  } | null
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  "em-desenvolvimento": "Em desenvolvimento",
  fila: "Na fila",
  pausado: "Pausado",
  concluido: "Concluído",
}

/** Ordem das colunas do Kanban (fila → em desenvolvimento → pausado → concluído). */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "fila",
  "em-desenvolvimento",
  "pausado",
  "concluido",
]

export const DEAL_KIND_LABEL: Record<DealKind, string> = {
  gratis: "Grátis",
  "a-vista": "À vista",
  parcelado: "Parcelado",
}

export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  mensal: "Mensal",
  anual: "Anual",
  avulso: "Avulso",
}

export const PAYER_LABEL: Record<Payer, string> = {
  eu: "Eu",
  cliente: "Cliente",
}

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  success: "Passou",
  failure: "Falhou",
  running: "Rodando",
  none: "Sem runs",
}

/** Texto do tooltip quando a badge do workflow aparece só com o ícone. */
export const WORKFLOW_STATUS_TOOLTIP: Record<WorkflowStatus, string> = {
  success: "GitHub Actions passou",
  failure: "GitHub Actions falhou",
  running: "GitHub Actions rodando",
  none: "Sem runs do GitHub Actions",
}

const MY_ACCOUNT = "rodrigo@fastbuilt.com.br"

// ponytail: mock local. Trocar por fetch quando a API existir — o shape já
// é o que a API deve devolver.
export const projects: Project[] = [
  {
    id: "1",
    name: "Portal do Corretor",
    client: "Marcelo Tavares",
    status: "em-desenvolvimento",
    deal: { kind: "parcelado", amount: 18000, installments: 3 },
    tools: [
      {
        id: "aws",
        name: "AWS",
        category: "deploy",
        account: MY_ACCOUNT,
        billing: {
          amount: 340.5,
          cycle: "mensal",
          nextInvoice: "2026-09-05",
          payer: "cliente",
        },
        secrets: [
          { key: "AWS_ACCESS_KEY_ID", value: "AKIAIOSFODNN7EXAMPLE" },
          { key: "AWS_REGION", value: "sa-east-1" },
        ],
      },
      {
        id: "resend",
        name: "Resend",
        category: "communication",
        account: MY_ACCOUNT,
        billing: {
          amount: 20,
          cycle: "mensal",
          nextInvoice: "2026-09-01",
          payer: "eu",
        },
        secrets: [{ key: "RESEND_API_KEY", value: "re_123456789_exemplo" }],
      },
      {
        id: "supabase",
        name: "Supabase",
        category: "database",
        account: "rodrigoaraujo7 (GitHub)",
        secrets: [
          { key: "SUPABASE_URL", value: "https://abcd.supabase.co" },
          { key: "SUPABASE_ANON_KEY", value: "eyJhbGciOi_exemplo" },
        ],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/portal-corretor",
      url: "https://github.com/rodrigoaraujo7/portal-corretor",
      workflow: "success",
    },
  },
  {
    id: "2",
    name: "E-commerce Nutri",
    client: "Camila Bastos",
    status: "em-desenvolvimento",
    deal: { kind: "parcelado", amount: 24500, installments: 5 },
    tools: [
      {
        id: "vercel",
        name: "Vercel",
        category: "deploy",
        account: "rodrigoaraujo7 (GitHub)",
        billing: {
          amount: 20,
          cycle: "mensal",
          nextInvoice: "2026-09-12",
          payer: "eu",
        },
        secrets: [],
      },
      {
        id: "stripe",
        name: "Stripe",
        category: "payments",
        account: "financeiro@nutri.com.br (cliente)",
        billing: {
          amount: 0.99,
          cycle: "avulso",
          nextInvoice: "2026-08-20",
          payer: "cliente",
        },
        secrets: [
          { key: "STRIPE_SECRET_KEY", value: "sk_test_exemplo" },
          { key: "STRIPE_WEBHOOK_SECRET", value: "whsec_exemplo" },
        ],
      },
      {
        id: "sentry",
        name: "Sentry",
        category: "observability",
        secrets: [{ key: "SENTRY_DSN", value: "https://exemplo@sentry.io/1" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/nutri-store",
      url: "https://github.com/rodrigoaraujo7/nutri-store",
      workflow: "failure",
    },
  },
  {
    id: "3",
    name: "App de Agendamento",
    client: "Studio Belle",
    status: "fila",
    deal: { kind: "a-vista", amount: 7200 },
    tools: [
      {
        id: "railway",
        name: "Railway",
        category: "deploy",
        account: MY_ACCOUNT,
        billing: {
          amount: 25,
          cycle: "mensal",
          nextInvoice: "2026-09-03",
          payer: "eu",
        },
        secrets: [{ key: "DATABASE_URL", value: "postgres://exemplo" }],
      },
      {
        id: "twilio",
        name: "Twilio",
        category: "communication",
        account: "contato@studiobelle.com",
        billing: {
          amount: 80,
          cycle: "mensal",
          nextInvoice: "2026-09-10",
          payer: "cliente",
        },
        secrets: [
          { key: "TWILIO_ACCOUNT_SID", value: "AC_exemplo" },
          { key: "TWILIO_AUTH_TOKEN", value: "token_exemplo" },
        ],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/agenda-belle",
      url: "https://github.com/rodrigoaraujo7/agenda-belle",
      workflow: "none",
    },
  },
  {
    id: "4",
    name: "Dashboard Logística",
    client: "TransRápido",
    status: "pausado",
    deal: { kind: "parcelado", amount: 31000, installments: 4 },
    tools: [
      {
        id: "aws",
        name: "AWS",
        category: "deploy",
        account: MY_ACCOUNT,
        billing: {
          amount: 780,
          cycle: "mensal",
          nextInvoice: "2026-09-05",
          payer: "cliente",
        },
        secrets: [{ key: "AWS_ACCESS_KEY_ID", value: "AKIA_exemplo" }],
      },
      {
        id: "datadog",
        name: "Datadog",
        category: "observability",
        account: "ops@transrapido.com.br (cliente)",
        billing: {
          amount: 1500,
          cycle: "anual",
          nextInvoice: "2027-02-01",
          payer: "cliente",
        },
        secrets: [{ key: "DD_API_KEY", value: "dd_exemplo" }],
      },
      {
        id: "posthog",
        name: "PostHog",
        category: "analytics",
        secrets: [{ key: "POSTHOG_KEY", value: "phc_exemplo" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/transrapido-dash",
      url: "https://github.com/rodrigoaraujo7/transrapido-dash",
      workflow: "success",
    },
  },
  {
    id: "5",
    name: "Landing Page Institucional",
    client: "Advocacia Prado",
    status: "concluido",
    deal: { kind: "a-vista", amount: 3500 },
    tools: [
      { id: "vercel", name: "Vercel", category: "deploy", secrets: [] },
      {
        id: "plausible",
        name: "Plausible",
        category: "analytics",
        account: MY_ACCOUNT,
        billing: {
          amount: 90,
          cycle: "anual",
          nextInvoice: "2026-11-14",
          payer: "eu",
        },
        secrets: [],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/prado-site",
      url: "https://github.com/rodrigoaraujo7/prado-site",
      workflow: "success",
    },
  },
  {
    id: "6",
    name: "API de Integração ERP",
    client: "Distribuidora Norte",
    status: "em-desenvolvimento",
    deal: { kind: "parcelado", amount: 42000, installments: 6 },
    tools: [
      {
        id: "railway",
        name: "Railway",
        category: "deploy",
        account: "dev@distnorte.com.br (cliente)",
        billing: {
          amount: 45,
          cycle: "mensal",
          nextInvoice: "2026-09-08",
          payer: "cliente",
        },
        secrets: [{ key: "DATABASE_URL", value: "postgres://exemplo" }],
      },
      {
        id: "neon",
        name: "Neon",
        category: "database",
        account: MY_ACCOUNT,
        billing: {
          amount: 19,
          cycle: "mensal",
          nextInvoice: "2026-09-02",
          payer: "eu",
        },
        secrets: [{ key: "NEON_DATABASE_URL", value: "postgres://exemplo" }],
      },
      {
        id: "sentry",
        name: "Sentry",
        category: "observability",
        account: MY_ACCOUNT,
        billing: {
          amount: 26,
          cycle: "mensal",
          nextInvoice: "2026-09-15",
          payer: "eu",
        },
        secrets: [{ key: "SENTRY_DSN", value: "https://exemplo@sentry.io/2" }],
      },
      {
        id: "betterstack",
        name: "Better Stack",
        category: "observability",
        secrets: [],
      },
      {
        id: "outra",
        name: "TOTVS Protheus API",
        category: "other",
        account: "integra@distnorte.com.br (cliente)",
        secrets: [{ key: "PROTHEUS_TOKEN", value: "tk_exemplo" }],
      },
    ],
    repo: {
      fullName: "rodrigoaraujo7/erp-bridge",
      url: "https://github.com/rodrigoaraujo7/erp-bridge",
      workflow: "running",
    },
  },
  {
    id: "7",
    name: "Sistema de Chamados",
    client: "Clínica Vitalis",
    status: "fila",
    deal: { kind: "a-vista", amount: 9800 },
    tools: [
      { id: "supabase", name: "Supabase", category: "database", secrets: [] },
    ],
    repo: null,
  },
  {
    id: "8",
    name: "Blog Técnico",
    client: "Pessoal",
    status: "concluido",
    deal: { kind: "gratis" },
    tools: [
      { id: "cloudflare", name: "Cloudflare", category: "deploy", secrets: [] },
      { id: "umami", name: "Umami", category: "analytics", secrets: [] },
    ],
    repo: {
      fullName: "rodrigoaraujo7/blog",
      url: "https://github.com/rodrigoaraujo7/blog",
      workflow: "success",
    },
  },
]
