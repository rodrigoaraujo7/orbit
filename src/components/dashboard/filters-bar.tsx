import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select, type SelectOption } from "@/components/ui/select";
import type { Project } from "@/data/projects";
import { addMonths, monthOf, todayIso } from "@/lib/dates";
import { availableCurrencies, emptyFilters, type DashboardFilters } from "@/lib/dashboard-metrics";
import { useRegistry } from "@/lib/registry-store";

type Preset = { label: string; months: number | "year" | "all" };

// Month granularity, not day: an installment carries a `referenceMonth` and a
// tool bills on a cycle — a day boundary would split nothing.
const PRESETS: Preset[] = [
  { label: "6 meses", months: 6 },
  { label: "12 meses", months: 12 },
  { label: "Este ano", months: "year" },
  { label: "Tudo", months: "all" },
];

function presetRange(preset: Preset): { monthFrom: string; monthTo: string } {
  const current = monthOf(todayIso());
  if (preset.months === "all") return { monthFrom: "", monthTo: "" };
  if (preset.months === "year") {
    return { monthFrom: `${current.slice(0, 4)}-01`, monthTo: `${current.slice(0, 4)}-12` };
  }
  return { monthFrom: addMonths(current, -(preset.months - 1)), monthTo: current };
}

function isActivePreset(filters: DashboardFilters, preset: Preset) {
  const range = presetRange(preset);
  return filters.monthFrom === range.monthFrom && filters.monthTo === range.monthTo;
}

export function FiltersBar({
  projects,
  filters,
  onChange,
}: {
  projects: Project[];
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}) {
  const { contacts } = useRegistry();

  function set(patch: Partial<DashboardFilters>) {
    onChange({ ...filters, ...patch });
  }

  // Only clients that actually have a project — an empty option would filter
  // the whole dashboard down to nothing with no way to tell why.
  const clientOptions: SelectOption[] = [
    { value: "", label: "Todos os clientes" },
    ...contacts
      .filter((contact) => projects.some((project) => project.clientId === contact.id))
      .map((contact) => ({ value: contact.id, label: contact.name })),
  ];

  // Picking a client narrows the project list, so the two filters can't be
  // combined into an empty result by accident.
  const projectOptions: SelectOption[] = [
    { value: "", label: "Todos os projetos" },
    ...projects
      .filter((project) => !filters.clientId || project.clientId === filters.clientId)
      .map((project) => ({ value: project.id, label: project.name })),
  ];

  const currencyOptions: SelectOption[] = availableCurrencies(projects).map((currency) => ({
    value: currency,
    label: currency,
  }));

  const isFiltered =
    filters.monthFrom !== "" ||
    filters.monthTo !== "" ||
    filters.projectId !== "" ||
    filters.clientId !== "" ||
    filters.currency !== emptyFilters.currency;

  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            data-active={isActivePreset(filters, preset) || undefined}
            className="text-muted-foreground data-active:bg-accent data-active:text-foreground"
            onClick={() => set(presetRange(preset))}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <MonthPicker
            value={filters.monthFrom}
            onChange={(monthFrom) => set({ monthFrom })}
            placeholder="Início"
            aria-label="Mês inicial do período"
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            até
          </span>
          <MonthPicker
            value={filters.monthTo}
            onChange={(monthTo) => set({ monthTo })}
            placeholder="Fim"
            aria-label="Mês final do período"
          />
        </div>

        <div className="w-full sm:w-52">
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
            placeholder="Todos os clientes"
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={filters.projectId}
            onValueChange={(projectId) => set({ projectId })}
            options={projectOptions}
            placeholder="Todos os projetos"
          />
        </div>

        <div className="w-full sm:w-28">
          <Select
            value={filters.currency}
            onValueChange={(currency) => set({ currency })}
            options={currencyOptions}
            placeholder="Moeda"
          />
        </div>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={() => onChange(emptyFilters)}>
            <X />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
