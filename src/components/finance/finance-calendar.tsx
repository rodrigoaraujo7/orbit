import { useMemo, useState } from "react";
import type { DayButtonProps } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";

import { CalendarDayButton, Calendar } from "@/components/ui/calendar";
import type { FinanceEvent } from "@/lib/finance-events";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const EVENT_DOT: Record<FinanceEvent["status"], string> = {
  paid: "bg-success",
  pending: "bg-warning",
  overdue: "bg-destructive",
};

/** One row per event, shown below the calendar for whatever day is selected. */
function DayEventRow({ event }: { event: FinanceEvent }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{event.label}</p>
        <p className="truncate text-xs text-muted-foreground">{event.projectName}</p>
      </div>
      <span
        className={cn(
          "shrink-0 font-heading text-lg tabular-nums tracking-wide",
          event.type === "receivable" ? "text-success" : "text-destructive",
        )}
      >
        {event.type === "payable" ? "-" : "+"}
        {formatCurrency(event.amount, event.currency)}
      </span>
    </div>
  );
}

/** Calendar day button with a dot per distinct event status that day carries. */
function EventDayButton(byDate: Map<string, FinanceEvent[]>) {
  return function FinanceDayButton(props: DayButtonProps) {
    const iso = `${props.day.date.getFullYear()}-${String(props.day.date.getMonth() + 1).padStart(2, "0")}-${String(props.day.date.getDate()).padStart(2, "0")}`;
    const dayEvents = byDate.get(iso) ?? [];
    const statuses = [...new Set(dayEvents.map((event) => event.status))];

    return (
      <div className="relative">
        <CalendarDayButton {...props} />
        {statuses.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
            {statuses.map((status) => (
              <span key={status} className={cn("size-1 rounded-full", EVENT_DOT[status])} />
            ))}
          </div>
        )}
      </div>
    );
  };
}

/**
 * "Agenda inteligente": a day calendar with a dot per event status, plus the
 * list of events for whatever day is selected.
 */
export function FinanceCalendar({ events }: { events: FinanceEvent[] }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, FinanceEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const selectedIso = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`
    : "";
  const dayEvents = byDate.get(selectedIso) ?? [];

  return (
    <div className="rounded-xl border p-4">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        locale={ptBR}
        components={{ DayButton: EventDayButton(byDate) }}
        className="mx-auto"
      />

      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium">{selected ? formatDate(selectedIso) : "Selecione um dia"}</p>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento nesse dia.</p>
        ) : (
          dayEvents.map((event) => <DayEventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
