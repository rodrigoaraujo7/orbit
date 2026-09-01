export type ToolCategory =
  | 'deploy'
  | 'database'
  | 'observability'
  | 'analytics'
  | 'communication'
  | 'payments'
  | 'ai'
  | 'other'

export const TOOL_CATEGORY_LABEL: Record<ToolCategory, string> = {
  deploy: 'Deploy & Hosting',
  database: 'Banco de dados',
  observability: 'Observabilidade',
  analytics: 'Métricas & Analytics',
  communication: 'Comunicação',
  payments: 'Pagamentos',
  ai: 'IA',
  other: 'Outra',
}
