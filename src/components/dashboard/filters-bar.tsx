import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

  const activePreset = PRESETS.find((preset) => isActivePreset(filters, preset));
  const periodOptions: SelectOption[] = PRESETS.map((preset) => ({
    value: String(preset.months),
    label: preset.label,
  }));

  return (
    <>
      <div className={stacked ? "w-full" : "w-40 shrink-0"}>
        <Select
          value={activePreset ? String(activePreset.months) : ""}
          onValueChange={(value) => {
            const preset = PRESETS.find((p) => String(p.months) === value);
            if (preset) set(presetRange(preset));
          }}
          options={periodOptions}
          placeholder="Período"
        />
      </div>

      <div className={stacked ? "flex w-full items-center gap-2 [&>button]:min-w-0 [&>button]:flex-1" : "flex shrink-0 items-center gap-2"}>
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
          placeholder="Todos os clientes"
        />
      </div>

      <div className={stacked ? "w-full" : "min-w-0 flex-1"}>
        <Select
          value={filters.projectId}
          onValueChange={(projectId) => set({ projectId })}
          options={projectOptions}
          placeholder="Todos os projetos"
        />
      </div>

      <div className={stacked ? "w-full" : "w-28 shrink-0"}>
        <Select
          value={filters.currency}
          onValueChange={(currency) => set({ currency })}
          options={currencyOptions}
          placeholder="Moeda"
        />
      </div>

      {hasActiveFilters(filters) && !stacked && (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onChange(emptyFilters)}>
          <X data-icon="inline-start" />
          Limpar
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

      <div className="md:hidden">
        <Drawer showSwipeHandle>
          <DrawerTrigger render={<Button variant="outline" />}>
            <Filter data-icon="inline-start" />
            Filtro
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filtros</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-3 overflow-y-auto p-4">
              <FilterFields stacked projects={projects} filters={filters} onChange={onChange} />
            </div>
            <DrawerFooter>
              <Button
                variant="ghost"
                disabled={!hasActiveFilters(filters)}
                onClick={() => onChange(emptyFilters)}
              >
                <X data-icon="inline-start" />
                Limpar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
