import { X } from "lucide-react"
import { emptyFilters, type DashboardFilters, type DashboardOptions } from "shared"

import { Button } from "@/components/ui/button"
import { FilterDrawer } from "@/components/ui/filter-drawer"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, type SelectOption } from "@/components/ui/select"
import { addMonths, monthOf, todayIso } from "@/lib/dates"

type Preset = { label: string; months: number | "year" | "all" }

const PRESETS: Preset[] = [
  { label: "6 meses", months: 6 },
  { label: "12 meses", months: 12 },
  { label: "Este ano", months: "year" },
  { label: "Tudo", months: "all" },
]

function presetRange(preset: Preset): { monthFrom: string; monthTo: string } {
  const current = monthOf(todayIso())
  if (preset.months === "all") return { monthFrom: "", monthTo: "" }
  if (preset.months === "year") {
    return { monthFrom: `${current.slice(0, 4)}-01`, monthTo: `${current.slice(0, 4)}-12` }
  }
  return { monthFrom: addMonths(current, -(preset.months - 1)), monthTo: current }
}

function isActivePreset(filters: DashboardFilters, preset: Preset) {
  const range = presetRange(preset)
  return filters.monthFrom === range.monthFrom && filters.monthTo === range.monthTo
}

function hasActiveFilters(filters: DashboardFilters) {
  return (
    filters.monthFrom !== "" ||
    filters.monthTo !== "" ||
    filters.projectId !== "" ||
    filters.clientId !== "" ||
    filters.currency !== emptyFilters.currency
  )
}

function FilterFields({
  stacked = false,
  options,
  filters,
  onChange,
}: {
  stacked?: boolean
  options: DashboardOptions
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}) {
  function set(patch: Partial<DashboardFilters>) {
    onChange({ ...filters, ...patch })
  }

  const clientOptions: SelectOption[] = [
    { value: "", label: "Todos os clientes" },
    ...options.clients.map((contact) => ({ value: contact.id, label: contact.name })),
  ]

  const projectOptions: SelectOption[] = [
    { value: "", label: "Todos os projetos" },
    ...options.projects
      .filter((project) => !filters.clientId || project.clientId === filters.clientId)
      .map((project) => ({ value: project.id, label: project.name })),
  ]

  const currencyOptions: SelectOption[] = options.currencies.map((currency) => ({
    value: currency,
    label: currency,
  }))

  const activePreset = PRESETS.find((preset) => isActivePreset(filters, preset))
  const periodOptions: SelectOption[] = PRESETS.map((preset) => ({
    value: String(preset.months),
    label: preset.label,
  }))

  return (
    <>
      <div className={stacked ? "w-full" : "w-40 shrink-0"}>
        <Select
          value={activePreset ? String(activePreset.months) : ""}
          onValueChange={(value) => {
            const preset = PRESETS.find((p) => String(p.months) === value)
            if (preset) set(presetRange(preset))
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
          onValueChange={(clientId) =>
            set({
              clientId,
              projectId:
                clientId && options.projects.find((p) => p.id === filters.projectId)?.clientId !== clientId
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
  )
}

export function FiltersBar({
  options,
  filters,
  onChange,
}: {
  options: DashboardOptions
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6 lg:px-8">
      <div className="hidden w-full gap-2 md:flex md:flex-row md:items-center">
        <FilterFields options={options} filters={filters} onChange={onChange} />
      </div>

      <FilterDrawer hasActive={hasActiveFilters(filters)} onClear={() => onChange(emptyFilters)}>
        <FilterFields stacked options={options} filters={filters} onChange={onChange} />
      </FilterDrawer>
    </div>
  )
}
