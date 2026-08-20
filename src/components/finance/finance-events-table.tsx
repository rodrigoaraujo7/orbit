import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select, type SelectOption } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/table";
import type { InvoiceStatus } from "@/data/projects";
import { INVOICE_STATUS_LABEL } from "@/data/projects";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FinanceEvent } from "@/lib/finance-events";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<InvoiceStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  paid: "success",
  overdue: "destructive",
};

function StatusDot({ className }: { className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} />;
}

const STATUS_DOT: Record<InvoiceStatus, string> = {
  pending: "bg-warning",
  paid: "bg-success",
  overdue: "bg-destructive",
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "Todos os status", icon: <StatusDot className="bg-muted-foreground/40" /> },
  { value: "pending", label: INVOICE_STATUS_LABEL.pending, icon: <StatusDot className={STATUS_DOT.pending} /> },
  { value: "paid", label: INVOICE_STATUS_LABEL.paid, icon: <StatusDot className={STATUS_DOT.paid} /> },
  { value: "overdue", label: INVOICE_STATUS_LABEL.overdue, icon: <StatusDot className={STATUS_DOT.overdue} /> },
];

// Urgency order, not alphabetical: whatever needs action comes first.
const STATUS_SORT_WEIGHT: Record<InvoiceStatus, number> = { pending: 0, overdue: 1, paid: 2 };

const COLUMNS: Column<FinanceEvent>[] = [
  {
    key: "date",
    header: "Data",
    sortValue: (event) => event.date,
    cell: (event) => formatDate(event.date),
  },
  {
    key: "type",
    header: "Tipo",
    sortValue: (event) => event.type,
    cell: (event) => (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {event.type === "receivable" ? (
          <ArrowUpCircle className="size-3.5 shrink-0 text-success" />
        ) : (
          <ArrowDownCircle className="size-3.5 shrink-0 text-destructive" />
        )}
        {event.type === "receivable" ? "Receber" : "Pagar"}
      </span>
    ),
  },
  {
    key: "label",
    header: "Projeto / Ferramenta",
    sortValue: (event) => event.projectName,
    cell: (event) => (
      <div>
        <p className="font-medium">{event.label}</p>
        <p className="text-xs text-muted-foreground">{event.projectName}</p>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Valor",
    sortValue: (event) => event.amount,
    cell: (event) => formatCurrency(event.amount, event.currency),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (event) => STATUS_SORT_WEIGHT[event.status],
    cell: (event) => <Badge variant={STATUS_VARIANT[event.status]}>{INVOICE_STATUS_LABEL[event.status]}</Badge>,
  },
];

/** Global table of every finance event — project invoices and tool charges, side by side. */
export function FinanceEventsTable({ events }: { events: FinanceEvent[] }) {
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");

  const filtered = status === "all" ? events : events.filter((event) => event.status === status);

  return (
    <div>
      <div className="mb-4 w-44">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as InvoiceStatus | "all")}
          options={STATUS_OPTIONS}
        />
      </div>

      <DataTable
        data={filtered}
        columns={COLUMNS}
        rowKey={(event) => event.id}
        initialSort={{ key: "date", direction: "asc" }}
        emptyMessage="Nenhuma fatura encontrada com esses filtros."
      />
    </div>
  );
}
