import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Wallet, Wrench } from "lucide-react";
import {
  compactSearch,
  dashboardSearchSchema,
  DEFAULT_CURRENCY,
  emptyFilters,
  parseSearch,
  toDashboardFilters,
  type DashboardFilters,
} from "shared";

import { HeroFigure } from "@/components/dashboard/cards";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { FinanceTab } from "@/components/dashboard/finance-tab";
import { ToolsTab } from "@/components/dashboard/tools-tab";
import { PageHeader } from "@/components/layout/page";
import { DashboardFilterSkeleton, FilterPending } from "@/components/ui/filter-pending";
import { Tabs, TabsDock, TabsDockTab, TabsPanel } from "@/components/ui/tabs";
import { formatMonthLong, formatPercent } from "@/lib/format";
import { trpc } from "@/lib/trpc";

function profitHint(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "Sem movimento no período" : "Sem período anterior pra comparar";
  const change = (current - previous) / Math.abs(previous);
  const verb = change >= 0 ? "acima" : "abaixo";
  return `${formatPercent(Math.abs(change))} ${verb} do período anterior`;
}

function searchToFilters(search: ReturnType<typeof Route.useSearch>): DashboardFilters {
  return toDashboardFilters({
    monthFrom: search.from,
    monthTo: search.to,
    clientId: search.client,
    projectId: search.project,
    currency: search.currency,
  });
}

function DashboardPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const filters = searchToFilters(search);

  const query = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () =>
      trpc.dashboard.metrics.query({
        monthFrom: filters.monthFrom || undefined,
        monthTo: filters.monthTo || undefined,
        clientId: filters.clientId || undefined,
        projectId: filters.projectId || undefined,
        currency: filters.currency,
      }),
    placeholderData: keepPreviousData,
  });

  const metrics = query.data;
  const summary = metrics?.summary;
  const months = metrics?.months ?? [];
  const currency = metrics?.currency ?? filters.currency;
  const options = metrics?.options ?? { clients: [], projects: [], currencies: [DEFAULT_CURRENCY] };

  const period =
    months.length === 0
      ? "Nenhum mês no período"
      : `${formatMonthLong(months[0])} — ${formatMonthLong(months[months.length - 1])}`;

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
    });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
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
              {summary.foraDaMoeda}{" "}
              {summary.foraDaMoeda === 1 ? "projeto está" : "projetos estão"} em outra moeda e
              {summary.foraDaMoeda === 1 ? " ficou" : " ficaram"} de fora — valores nunca são
              convertidos.
            </p>
          )}

          {metrics && (
            <Tabs defaultValue="finance">
              <TabsDock>
                <TabsDockTab value="finance" icon={Wallet}>
                  Financeiro
                </TabsDockTab>
                <TabsDockTab value="tools" icon={Wrench}>
                  Ferramentas
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
  );
}

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search) => parseSearch(dashboardSearchSchema, search),
  component: DashboardPage,
});
