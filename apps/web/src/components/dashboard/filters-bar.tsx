import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select, type SelectOption } from "@/components/ui/select";
import type { Project } from "@/data/projects";
import { addMonths, monthOf, todayIso } from "@/lib/dates";
import { availableCurrencies, emptyFilters, type DashboardFilters } from "@/lib/dashboard-metrics";
import { useRegistry } from "@/lib/registry-store";

type PresetMonths = number | "year" | "all";

const PRESETS: { id: "preset6" | "preset12" | "presetYear" | "presetAll"; months: PresetMonths }[] = [
  { id: "preset6", months: 6 },
  { id: "preset12", months: 12 },
  { id: "presetYear", months: "year" },
  { id: "presetAll", months: "all" },
];

function presetRange(months: PresetMonths): { monthFrom: string; monthTo: string } {
  const current = monthOf(todayIso());
  if (months === "all") return { monthFrom: "", monthTo: "" };
  if (months === "year") {
    return { monthFrom: `${current.slice(0, 4)}-01`, monthTo: `${current.slice(0, 4)}-12` };
  }
  return { monthFrom: addMonths(current, -(months - 1)), monthTo: current };
}

function isActivePreset(filters: DashboardFilters, months: PresetMonths) {
  const range = presetRange(months);
  return filters.monthFrom === range.monthFrom && filters.monthTo === range.monthTo;
}

function hasActiveFilters(filters: DashboardFilters) {
  return (
    filters.monthFrom !== "" ||
    filters.monthTo !== "" ||
    filters.projectId !== "" ||
    filters.clientId !== "" ||
    filters.currency !== emptyFilters.currency
  );
}

function FilterFields({
  stacked = false,
  projects,
  filters,
  onChange,
}: {
  stacked?: boolean
  projects: Project[]
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}) {
  const { t } = useTranslation();
  const { contacts } = useRegistry();

  function set(patch: Partial<DashboardFilters>) {
    onChange({ ...filters, ...patch });
  }

  // Only clients that actually have a project — an empty option would filter
  // the whole dashboard down to nothing with no way to tell why.
  const clientOptions: SelectOption[] = [
    { value: "", label: t("common.allClients") },
    ...contacts
      .filter((contact) => projects.some((project) => project.clientId === contact.id))
      .map((contact) => ({ value: contact.id, label: contact.name })),
  ];

  // Picking a client narrows the project list, so the two filters can't be
  // combined into an empty result by accident.
  const projectOptions: SelectOption[] = [
    { value: "", label: t("common.allProjects") },
    ...projects
      .filter((project) => !filters.clientId || project.clientId === filters.clientId)
      .map((project) => ({ value: project.id, label: project.name })),
  ];

  const currencyOptions: SelectOption[] = availableCurrencies(projects).map((currency) => ({
    value: currency,
    label: currency,
  }));

  const activePreset = PRESETS.find((preset) => isActivePreset(filters, preset.months));
  const periodOptions: SelectOption[] = PRESETS.map((preset) => ({
    value: String(preset.months),
    label: t(`dashboard.${preset.id}`),
  }));

  return (
    <>
      <div className={stacked ? "w-full" : "w-40 shrink-0"}>
        <Select
          value={activePreset ? String(activePreset.months) : ""}
          onValueChange={(value) => {
            const preset = PRESETS.find((p) => String(p.months) === value);
            if (preset) set(presetRange(preset.months));
          }}
          options={periodOptions}
          placeholder={t("common.period")}
        />
      </div>

      <div className={stacked ? "flex w-full items-center gap-2 [&>button]:min-w-0 [&>button]:flex-1" : "flex shrink-0 items-center gap-2"}>
        <MonthPicker
          value={filters.monthFrom}
          onChange={(monthFrom) => set({ monthFrom })}
          placeholder={t("common.start")}
          aria-label={t("common.periodStartMonth")}
        />
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          {t("common.until")}
        </span>
        <MonthPicker
          value={filters.monthTo}
          onChange={(monthTo) => set({ monthTo })}
          placeholder={t("common.end")}
          aria-label={t("common.periodEndMonth")}
        />
      </div>

      <div className={stacked ? "w-full" : "min-w-0 flex-1"}>
        <Select
          value={filters.clientId}
          // clearing the client also clears a project that no longer belongs to it
          onValueChange={(clientId) =>
            set({
              clientId,
              projectId:
                clientId && projects.find((p) => p.id === filters.projectId)?.clientId !== clientId
                  ? ""
                  : filters.projectId,
            })
          }
          options={clientOptions}
          placeholder={t("common.allClients")}
        />
      </div>

      <div className={stacked ? "w-full" : "min-w-0 flex-1"}>
        <Select
          value={filters.projectId}
          onValueChange={(projectId) => set({ projectId })}
          options={projectOptions}
          placeholder={t("common.allProjects")}
        />
      </div>

      <div className={stacked ? "w-full" : "w-28 shrink-0"}>
        <Select
          value={filters.currency}
          onValueChange={(currency) => set({ currency })}
          options={currencyOptions}
          placeholder={t("common.currency")}
        />
      </div>

      {hasActiveFilters(filters) && !stacked && (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onChange(emptyFilters)}>
          <X data-icon="inline-start" />
          {t("common.clear")}
        </Button>
      )}
    </>
  );
}

export function FiltersBar({
  projects,
  filters,
  onChange,
}: {
  projects: Project[]
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6 lg:px-8">
      <div className="hidden w-full gap-2 md:flex md:flex-row md:items-center">
        <FilterFields projects={projects} filters={filters} onChange={onChange} />
      </div>

      <FilterDrawer hasActive={hasActiveFilters(filters)} onClear={() => onChange(emptyFilters)}>
        <FilterFields stacked projects={projects} filters={filters} onChange={onChange} />
      </FilterDrawer>
    </div>
  );
}
