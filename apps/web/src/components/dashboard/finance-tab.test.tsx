import type { ReactNode } from 'react'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceTab } from './finance-tab'
import { emptyMetrics } from '@/test/mocks'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => true,
}))

vi.mock('recharts', async () => {
  const { rechartsStub } = await import('@/test/chart-mocks')
  return rechartsStub()
})

vi.mock('@/components/ui/chart', async () => {
  const { invokeChartTooltip } = await import('@/test/chart-mocks')
  return {
    ChartContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    ChartLegend: () => null,
    ChartLegendContent: () => null,
    ChartTooltip: ({ content }: { content?: ReactNode }) => invokeChartTooltip(content),
    ChartTooltipContent: () => null,
  }
})

afterEach(() => {
  cleanup()
})

const filled = emptyMetrics({
  summary: {
    faturado: 100,
    recebido: 40,
    aReceber: 30,
    atrasado: 10,
    custo: 20,
    lucro: 80,
    margem: 0.8,
    clientes: 2,
    projetos: 1,
    foraDaMoeda: 0,
  },
  revenueByMonth: [{ month: '2026-01', recebido: 40, aReceber: 30, atrasado: 10 }],
  profitByProject: [
    { projectId: 'p1', name: 'Portal', receita: 100, custo: 20, lucro: 80, margem: 0.8 },
  ],
  clientGrowth: [{ month: '2026-01', clientes: 3, novos: 2 }],
  rulerLanes: [
    {
      projectId: 'p1',
      projectName: 'Portal',
      currency: 'BRL',
      byMonth: { '2026-01': [{ amount: 40, status: 'paid' }] },
    },
  ],
  months: ['2026-01'],
})

describe('FinanceTab', () => {
  it('shows empty chart states', () => {
    renderWithProviders(
      <FinanceTab
        summary={emptyMetrics().summary}
        revenue={[]}
        profits={[]}
        growth={[]}
        rulerLanes={[]}
        months={[]}
        currency="BRL"
      />,
    )
    expect(screen.getByText(/No invoices in BRL/)).toBeInTheDocument()
    expect(screen.getByText(/No projects in BRL/)).toBeInTheDocument()
  })

  it('renders charts when there is data', () => {
    renderWithProviders(
      <FinanceTab
        summary={filled.summary}
        revenue={filled.revenueByMonth}
        profits={filled.profitByProject}
        growth={filled.clientGrowth}
        rulerLanes={filled.rulerLanes}
        months={filled.months}
        currency="BRL"
      />,
    )
    expect(screen.getByText('Revenue by month')).toBeInTheDocument()
    expect(screen.getByText('Profit by project')).toBeInTheDocument()
    expect(screen.getByText('Client growth')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-tooltip').length).toBeGreaterThan(0)
    expect(screen.getByTestId('chart-label')).toBeInTheDocument()
  })
})
