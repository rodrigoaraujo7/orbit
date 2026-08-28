import { useTranslation } from "react-i18next";
import type { RulerLane } from "shared";

import type { InvoiceStatus } from "@/data/projects";
import { invoiceStatusLabel } from "@/i18n/labels";
import { monthOf, todayIso } from "@/lib/dates";
import { formatCurrency, formatMonth, formatMonthLong } from "@/lib/format";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Same three slots as the revenue chart, for the same reason: `--destructive`
 * is too close to the brand burgundy to sit beside it as a fill. Texture does the
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
  const { t } = useTranslation();
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {(["paid", "pending", "overdue"] as InvoiceStatus[]).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded-sm", TICK_CLASS[status])} aria-hidden="true" />
          {invoiceStatusLabel(status)}
        </li>
      ))}
    </ul>
  );
}

export function PaymentRuler({
  lanes,
  months,
  currency,
}: {
  lanes: RulerLane[]
  months: string[]
  currency: string
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const currentMonth = monthOf(todayIso());

  if (lanes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t("dashboard.noInstallments")}
      </p>
    );
  }

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
              <li key={lane.projectId} className="flex items-center gap-3 py-2">
                <span className="w-36 shrink-0 truncate text-sm" title={lane.projectName}>
                  {lane.projectName}
                </span>
                <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: columns }}>
                  {months.map((month) => {
                    const invoices = lane.byMonth[month];
                    if (!invoices) {
                      return (
                        <span
                          key={month}
                          className={cn(
                            "h-6 rounded-sm",
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
                    const label = `${lane.projectName} · ${formatMonthLong(month)} · ${formatCurrency(total, currency)} · ${invoiceStatusLabel(status)}`;

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
