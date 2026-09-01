import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Wallet, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  compactSearch,
  dashboardOptions,
  dashboardSearchSchema,
  emptyFilters,
  parseSearch,
  toDashboardFilters,
  type DashboardFilters,
} from 'shared'

import { HeroFigure } from '@/components/dashboard/cards'
import { FiltersBar } from '@/components/dashboard/filters-bar'
import { FinanceTab } from '@/components/dashboard/finance-tab'
import { ToolsTab } from '@/components/dashboard/tools-tab'
import { PageHeader } from '@/components/layout/page'
import { DashboardFilterSkeleton, FilterPending } from '@/components/ui/filter-pending'
import { Tabs, TabsDock, TabsDockTab, TabsPanel } from '@/components/ui/tabs'
import { formatMonthLong, formatPercent } from '@/lib/format'
import { useProjects } from '@/lib/projects-store'
import { useRegistry } from '@/lib/registry-store'
import { trpc } from '@/lib/trpc'

function searchToFilters(search: ReturnType<typeof Route.useSearch>): DashboardFilters {
  return toDashboardFilters({
    monthFrom: search.from,
    monthTo: search.to,
    clientId: search.client,
    projectId: search.project,
    currency: search.currency,
  })
}

function DashboardPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { projects } = useProjects()
  const { contacts } = useRegistry()
  const filters = searchToFilters(search)

  const query = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () =>
      trpc.dashboard.metrics.query({
        monthFrom: filters.monthFrom || undefined,
        monthTo: filters.monthTo || undefined,
        clientId: filters.clientId || undefined,
        projectId: filters.projectId || undefined,
        currency: filters.currency,
      }),
    placeholderData: keepPreviousData,
  })

  const metrics = query.data
  const summary = metrics?.summary
  const months = metrics?.months ?? []
  const currency = metrics?.currency ?? filters.currency
  const options = metrics?.options ?? dashboardOptions(projects, contacts)

  function profitHint(current: number, previous: number) {
    if (previous === 0) return current === 0 ? t('dashboard.noMovement') : t('dashboard.noPrevious')
    const change = (current - previous) / Math.abs(previous)
    return t('dashboard.vsPrevious', {
      percent: formatPercent(Math.abs(change)),
      direction: change >= 0 ? t('dashboard.above') : t('dashboard.below'),
    })
  }

  const period =
    months.length === 0
      ? t('dashboard.noMonths')
      : `${formatMonthLong(months[0])} ${t('common.emDash')} ${formatMonthLong(months[months.length - 1])}`

  function setFilters(next: DashboardFilters) {
    void navigate({
      search: compactSearch({
        from: next.monthFrom || undefined,
        to: next.monthTo || undefined,
        client: next.clientId || undefined,
        project: next.projectId || undefined,
        currency: next.currency === emptyFilters.currency ? undefined : next.currency,
      }),
      replace: true,
    })
  }

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={period}
        actions={
          summary ? (
            <HeroFigure
              value={summary.lucro}
              currency={currency}
              hint={profitHint(summary.lucro, metrics?.previous.lucro ?? 0)}
            />
          ) : null
        }
      />

      <FiltersBar options={options} filters={filters} onChange={setFilters} />

      <FilterPending
        isPending={query.isPending}
        isFetching={query.isFetching}
        skeleton={
          <div className="px-4 pt-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
            <DashboardFilterSkeleton />
          </div>
        }
      >
        <div className="px-4 pt-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
          {summary && summary.foraDaMoeda > 0 && (
            <p className="mb-4 text-xs text-muted-foreground">
              {t('dashboard.skipped', { count: summary.foraDaMoeda })}
            </p>
          )}

          {metrics && (
            <Tabs defaultValue="finance">
              <TabsDock>
                <TabsDockTab value="finance" icon={Wallet}>
                  {t('common.finance')}
                </TabsDockTab>
                <TabsDockTab value="tools" icon={Wrench}>
                  {t('common.tools')}
                </TabsDockTab>
              </TabsDock>

              <TabsPanel value="finance" className="pt-6">
                <FinanceTab
                  summary={metrics.summary}
                  revenue={metrics.revenueByMonth}
                  profits={metrics.profitByProject}
                  growth={metrics.clientGrowth}
                  rulerLanes={metrics.rulerLanes}
                  months={metrics.months}
                  currency={metrics.currency}
                />
              </TabsPanel>

              <TabsPanel value="tools" className="pt-6">
                <ToolsTab
                  summary={metrics.toolsSummary}
                  byTool={metrics.toolCostByTool}
                  byCategory={metrics.toolCostByCategory}
                  byMonth={metrics.toolCostByMonth}
                  rows={metrics.toolRows}
                  months={metrics.months}
                  currency={metrics.currency}
                />
              </TabsPanel>
            </Tabs>
          )}
        </div>
      </FilterPending>
    </>
  )
}

export const Route = createFileRoute('/dashboard')({
  validateSearch: (search) => parseSearch(dashboardSearchSchema, search),
  component: DashboardPage,
})
