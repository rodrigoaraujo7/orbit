export type ProjectStatus = "em-desenvolvimento" | "fila" | "pausado" | "concluido"

/** Resultado do último run do GitHub Actions no repo do projeto. */
export type WorkflowStatus = "success" | "failure" | "running" | "none"

export type Tool = {
  name: string
  /** Ferramenta paga (entra no custo do projeto) ou plano free. */
  paid: boolean
}

export type Project = {
  id: string
  name: string
  /** Contato principal do cliente. */
  client: string
  status: ProjectStatus
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

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  success: "Passou",
  failure: "Falhou",
  running: "Rodando",
  none: "Sem runs",
}

// ponytail: mock local. Trocar por fetch quando a API existir — o shape já
// é o que a API deve devolver.
export const projects: Project[] = [
  {
    id: "1",
    name: "Portal do Corretor",
    client: "Marcelo Tavares",
    status: "em-desenvolvimento",
    tools: [
      { name: "AWS", paid: true },
      { name: "Resend", paid: true },
      { name: "Supabase", paid: false },
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
    tools: [
      { name: "Vercel", paid: true },
      { name: "Stripe", paid: true },
      { name: "Sentry", paid: false },
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
    tools: [
      { name: "Railway", paid: true },
      { name: "Twilio", paid: true },
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
    tools: [
      { name: "AWS", paid: true },
      { name: "Datadog", paid: true },
      { name: "PostHog", paid: false },
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
    tools: [
      { name: "Vercel", paid: false },
      { name: "Plausible", paid: true },
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
    tools: [
      { name: "Railway", paid: true },
      { name: "Neon", paid: true },
      { name: "Sentry", paid: true },
      { name: "Better Stack", paid: false },
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
    tools: [{ name: "Supabase", paid: false }],
    repo: null,
  },
  {
    id: "8",
    name: "Blog Técnico",
    client: "Pessoal",
    status: "concluido",
    tools: [
      { name: "Cloudflare", paid: false },
      { name: "Umami", paid: false },
    ],
    repo: {
      fullName: "rodrigoaraujo7/blog",
      url: "https://github.com/rodrigoaraujo7/blog",
      workflow: "success",
    },
  },
]
