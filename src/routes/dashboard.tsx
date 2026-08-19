import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { HeroFigure } from "@/components/dashboard/cards";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { FinanceTab } from "@/components/dashboard/finance-tab";
import { ToolsTab } from "@/components/dashboard/tools-tab";
import { PageHeader } from "@/components/layout/page";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  applyFilters,
  emptyFilters,
  financeSummary,
  previousMonths,
  resolveMonths,
  type DashboardFilters,
} from "@/lib/dashboard-metrics";
import { formatCurrency, formatMonthLong, formatPercent } from "@/lib/format";
import { useProjects } from "@/lib/projects-store";

/** "cresceu 18% vs. período anterior" — or an honest note when there is no before. */
function profitHint(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "Sem movimento no período" : "Sem período anterior pra comparar";
  const change = (current - previous) / Math.abs(previous);
  const verb = change >= 0 ? "acima" : "abaixo";
  return `${formatPercent(Math.abs(change))} ${verb} do período anterior`;
}

function DashboardPage() {
  const { projects } = useProjects();
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);

  const filtered = applyFilters(projects, filters);
  const months = resolveMonths(projects, filters);
  const previous = previousMonths(months);

  const summary = financeSummary(filtered, months, filters.currency);
  const before = financeSummary(filtered, previous, filters.currency);

  const period =
    months.length === 0
      ? "Nenhum mês no período"
      : `${formatMonthLong(months[0])} — ${formatMonthLong(months[months.length - 1])}`;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={period}
        actions={
          <HeroFigure
            label="Lucro no período"
            value={summary.lucro}
            format={(value) => formatCurrency(value, filters.currency)}
            hint={profitHint(summary.lucro, before.lucro)}
          />
        }
      />

      <FiltersBar projects={projects} filters={filters} onChange={setFilters} />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {summary.foraDaMoeda > 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            {summary.foraDaMoeda}{" "}
            {summary.foraDaMoeda === 1 ? "projeto está" : "projetos estão"} em outra moeda e
            {summary.foraDaMoeda === 1 ? " ficou" : " ficaram"} de fora — valores nunca são
            convertidos.
          </p>
        )}

        <Tabs defaultValue="finance">
          <TabsList>
            <TabsTab value="finance">Financeiro</TabsTab>
            <TabsTab value="tools">Ferramentas</TabsTab>
          </TabsList>

          <TabsPanel value="finance" className="pt-6">
            <FinanceTab projects={filtered} months={months} currency={filters.currency} />
          </TabsPanel>

          <TabsPanel value="tools" className="pt-6">
            <ToolsTab projects={filtered} months={months} currency={filters.currency} />
          </TabsPanel>
        </Tabs>
      </div>
    </>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
