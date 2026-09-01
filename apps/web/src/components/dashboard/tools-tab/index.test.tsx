import type { ReactNode } from 'react'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToolsTab } from './index'
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

describe('ToolsTab', () => {
  it('shows empty paid-tool states and free-count hint', () => {
    renderWithProviders(
      <ToolsTab
        summary={emptyMetrics().toolsSummary}
        byTool={[]}
        byCategory={[]}
        byMonth={[]}
        rows={[]}
        months={['2026-01']}
        currency="BRL"
      />,
    )
    expect(screen.getByText(/No paid tools in BRL in this period/)).toBeInTheDocument()
    expect(screen.getByText(/No paid tools in BRL in the filtered projects/)).toBeInTheDocument()
    expect(screen.getByText('0 free')).toBeInTheDocument()
  })

  it('renders cost charts, category meters and the table', () => {
    const metrics = emptyMetrics({
      toolsSummary: {
        totalPeriodo: 100,
        eu: 70,
        cliente: 30,
        runRate: 20,
        pagas: 2,
        gratis: 1,
        maisCara: {
          key: 'vercel',
          name: 'Vercel',
          category: 'deploy',
          eu: 70,
          cliente: 0,
          total: 70,
          projetos: ['Portal'],
        },
        foraDaMoeda: 0,
      },
      toolCostByTool: [
        {
          key: 'vercel',
          name: 'Vercel',
          category: 'deploy',
          eu: 70,
          cliente: 0,
          total: 70,
          projetos: ['Portal'],
        },
      ],
      toolCostByCategory: [{ key: 'deploy', slot: 1, total: 70 }],
      toolCostByMonth: [{ month: '2026-01', eu: 70, cliente: 30 }],
      toolRows: [
        {
          id: 'r1',
          toolId: 'vercel',
          name: 'Vercel',
          category: 'deploy',
          projectId: 'p1',
          projectName: 'Portal',
          account: 'ada@test.local',
          cycle: 'monthly',
          amount: 20,
          monthly: 20,
          payer: 'me',
          currency: 'BRL',
        },
        {
          id: 'r2',
          toolId: 'resend',
          name: 'Resend',
          category: 'communication',
          projectId: 'p1',
          projectName: 'Portal',
          account: 'ada@test.local',
          cycle: 'yearly',
          amount: 0,
          monthly: 0,
          payer: 'client',
          currency: 'BRL',
        },
      ],
      months: ['2026-01'],
    })
    renderWithProviders(
      <ToolsTab
        summary={metrics.toolsSummary}
        byTool={metrics.toolCostByTool}
        byCategory={metrics.toolCostByCategory}
        byMonth={metrics.toolCostByMonth}
        rows={metrics.toolRows}
        months={metrics.months}
        currency="BRL"
      />,
    )
    expect(screen.getAllByText('Vercel').length).toBeGreaterThan(0)
    expect(screen.getByText(/highest: Vercel/)).toBeInTheDocument()
    expect(screen.getAllByText('Deploy & Hosting').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('chart-tooltip').length).toBeGreaterThan(0)
    expect(screen.getByTestId('chart-label')).toBeInTheDocument()
  })

  it('sorts every paid-tool column', async () => {
    const user = userEvent.setup()
    const metrics = emptyMetrics({
      toolRows: [
        {
          id: 'r1',
          toolId: 'vercel',
          name: 'Vercel',
          category: 'deploy',
          projectId: 'p1',
          projectName: 'Portal',
          account: 'ada@test.local',
          cycle: 'monthly',
          amount: 20,
          monthly: 20,
          payer: 'me',
          currency: 'BRL',
        },
        {
          id: 'r2',
          toolId: 'resend',
          name: 'Resend',
          category: 'communication',
          projectId: 'p1',
          projectName: 'Shop',
          account: 'bo@test.local',
          cycle: 'yearly',
          amount: 10,
          monthly: 0,
          payer: 'client',
          currency: 'BRL',
        },
      ],
      months: ['2026-01'],
    })
    renderWithProviders(
      <ToolsTab
        summary={metrics.toolsSummary}
        byTool={metrics.toolCostByTool}
        byCategory={metrics.toolCostByCategory}
        byMonth={metrics.toolCostByMonth}
        rows={metrics.toolRows}
        months={metrics.months}
        currency="BRL"
      />,
    )
    for (const name of [
      /Tool/,
      /Project/,
      /Category/,
      /Account/,
      /Amount/,
      /Per month/,
      /Who pays/,
    ]) {
      const header = screen.getByRole('columnheader', { name })
      await user.click(header.querySelector('button')!)
    }
  })
})
