import type { Invoice, InvoiceStatus, Project } from "@/data/projects";
import { INVOICE_STATUS_LABEL } from "@/data/projects";
import { dealCurrency } from "@/lib/dashboard-metrics";
import { monthOf, todayIso } from "@/lib/dates";
import { formatCurrency, formatMonth, formatMonthLong } from "@/lib/format";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { effectiveMonth } from "@/lib/invoice-table";
import { generateInvoices } from "@/lib/invoices";
import { cn } from "@/lib/utils";

/**
 * Same three slots as the revenue chart, for the same reason: `--destructive`
 * is too close to the brand bordô to sit beside it as a fill. Texture does the
 * rest of the work — solid, dashed outline, hatched — so the ruler survives
 * both colorblindness and a black-and-white print.
 */
const TICK_CLASS: Record<InvoiceStatus, string> = {
  paid: "bg-chart-1",
  pending: "border border-dashed border-chart-2 bg-chart-2/15",
  overdue:
    "bg-chart-3 [background-image:repeating-linear-gradient(45deg,transparent_0_3px,var(--background)_3px_4px)]",
};

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {(["paid", "pending", "overdue"] as InvoiceStatus[]).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded-sm", TICK_CLASS[status])} aria-hidden="true" />
          {INVOICE_STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  );
}

type Lane = {
  project: Project;
  currency: string;
  /** One entry per month of the range; several invoices can land on one month. */
  byMonth: Map<string, Invoice[]>;
};

/**
 * The signature view: every project's installments laid on one shared month
 * axis. Answers "who owes me what, and when" in a single glance — the question
 * a freelancer running six projects at once actually asks.
 *
 * Built as a CSS grid rather than a chart: the marks are discrete events on a
 * category axis, which is a table with position, not a plot.
 */
export function PaymentRuler({
  projects,
  months,
  currency,
}: {
  projects: Project[];
  months: string[];
  currency: string;
}) {
  const reduced = useReducedMotion();
  const currentMonth = monthOf(todayIso());
  const monthSet = new Set(months);

  const lanes: Lane[] = projects
    .filter((project) => dealCurrency(project) === currency)
    .map((project) => {
      const byMonth = new Map<string, Invoice[]>();
      for (const invoice of generateInvoices(project, "")) {
        const month = effectiveMonth(invoice);
        if (!monthSet.has(month)) continue;
        byMonth.set(month, [...(byMonth.get(month) ?? []), invoice]);
      }
      return { project, currency, byMonth };
    })
    .filter((lane) => lane.byMonth.size > 0);

  if (lanes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma parcela cai nesse período.
      </p>
    );
  }

  // A tick every ~4 months keeps the header readable on 19 months of history
  // without rotating labels.
  const labelEvery = Math.max(1, Math.ceil(months.length / 6));
  const columns = `repeat(${months.length}, minmax(0, 1fr))`;

  return (
    <div className="flex flex-col gap-4">
      <Legend />

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="flex items-end gap-3 pb-1">
            <span className="w-36 shrink-0" />
            <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: columns }}>
              {months.map((month, index) => (
                <span
                  key={month}
                  className={cn(
                    "truncate text-[10px] text-muted-foreground",
                    month === currentMonth && "font-semibold text-foreground",
                  )}
                >
                  {index % labelEvery === 0 || month === currentMonth ? formatMonth(month) : ""}
                </span>
              ))}
            </div>
          </div>

          <ul className="flex flex-col divide-y">
            {lanes.map((lane, laneIndex) => (
              <li key={lane.project.id} className="flex items-center gap-3 py-2">
                <span className="w-36 shrink-0 truncate text-sm" title={lane.project.name}>
                  {lane.project.name}
                </span>
                <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: columns }}>
                  {months.map((month) => {
                    const invoices = lane.byMonth.get(month);
                    if (!invoices) {
                      return (
                        <span
                          key={month}
                          className={cn(
                            "h-6 rounded-sm",
                            // the current month keeps a faint track so the "you are
                            // here" line stays visible across every lane
                            month === currentMonth && "bg-muted/60",
                          )}
                        />
                      );
                    }

                    const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
                    const status = invoices.some((invoice) => invoice.status === "overdue")
                      ? "overdue"
                      : invoices.every((invoice) => invoice.status === "paid")
                        ? "paid"
                        : "pending";
                    const label = `${lane.project.name} · ${formatMonthLong(month)} · ${formatCurrency(total, lane.currency)} · ${INVOICE_STATUS_LABEL[status]}`;

                    return (
                      <span
                        key={month}
                        title={label}
                        aria-label={label}
                        style={
                          reduced ? undefined : { animationDelay: `${laneIndex * 60 + 120}ms` }
                        }
                        className={cn(
                          "h-6 rounded-sm transition-transform hover:scale-y-125",
                          TICK_CLASS[status],
                          !reduced && "animate-in fade-in zoom-in-50 fill-mode-backwards duration-500",
                        )}
                      />
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
