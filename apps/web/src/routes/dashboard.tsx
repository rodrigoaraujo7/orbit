import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Wrench } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { HeroFigure } from "@/components/dashboard/cards";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { FinanceTab } from "@/components/dashboard/finance-tab";
import { ToolsTab } from "@/components/dashboard/tools-tab";
import { PageHeader } from "@/components/layout/page";
import { Tabs, TabsDock, TabsDockTab, TabsPanel } from "@/components/ui/tabs";
import {
  applyFilters,
  emptyFilters,
  financeSummary,
  previousMonths,
  resolveMonths,
  type DashboardFilters,
} from "@/lib/dashboard-metrics";
import { formatMonthLong, formatPercent } from "@/lib/format";
import { useProjects } from "@/lib/projects-store";

function DashboardPage() {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);

  const filtered = applyFilters(projects, filters);
  const months = resolveMonths(projects, filters);
  const previous = previousMonths(months);

  const summary = financeSummary(filtered, months, filters.currency);
  const before = financeSummary(filtered, previous, filters.currency);

  function profitHint(current: number, previousValue: number) {
    if (previousValue === 0) {
      return current === 0 ? t("dashboard.noMovement") : t("dashboard.noPrevious");
    }
    const change = (current - previousValue) / Math.abs(previousValue);
    return t("dashboard.vsPrevious", {
      percent: formatPercent(Math.abs(change)),
      direction: change >= 0 ? t("dashboard.above") : t("dashboard.below"),
    });
  }

  const period =
    months.length === 0
      ? t("dashboard.noMonths")
      : `${formatMonthLong(months[0])} ${t("common.emDash")} ${formatMonthLong(months[months.length - 1])}`;

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={period}
        actions={
          <HeroFigure
            value={summary.lucro}
            currency={filters.currency}
            hint={profitHint(summary.lucro, before.lucro)}
          />
        }
      />

      <FiltersBar projects={projects} filters={filters} onChange={setFilters} />

      <div className="px-4 pt-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
        {summary.foraDaMoeda > 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            {t("dashboard.skipped", { count: summary.foraDaMoeda })}
          </p>
        )}

        <Tabs defaultValue="finance">
          <TabsDock>
            <TabsDockTab value="finance" icon={Wallet}>
              {t("common.finance")}
            </TabsDockTab>
            <TabsDockTab value="tools" icon={Wrench}>
              {t("common.tools")}
            </TabsDockTab>
          </TabsDock>

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
