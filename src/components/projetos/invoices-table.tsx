import { Menu } from "@base-ui/react/menu";
import {
  Barcode,
  CreditCard,
  MoreVertical,
  Paperclip,
  QrCode,
  RefreshCw,
  Share2,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select, type SelectOption } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/table";
import {
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/data/projects";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { effectiveMonth, filterInvoices } from "@/lib/invoice-table";
import { cn } from "@/lib/utils";

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof Barcode> = {
  boleto: Barcode,
  pix: QrCode,
};

const STATUS_VARIANT: Record<InvoiceStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  pendente: "warning",
  paga: "success",
  atrasada: "destructive",
};

const menuItemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";

// Compartilhar/gerar boleto/pix/alterar status/anexar ainda não fazem nada —
// sem API de faturas por enquanto, os itens são só UI (mesmo estado de
// antes, em invoice-card.tsx).
function InvoiceActionsMenu({ invoice }: { invoice: Invoice }) {
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="ghost" size="icon-sm" aria-label="Mais ações" />}>
        <MoreVertical />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-[60]">
          <Menu.Popup className="min-w-44 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.Item onClick={() => {}} className={menuItemClass}>
              <Share2 className="size-3.5" />
              Compartilhar fatura
            </Menu.Item>
            <Menu.Item onClick={() => {}} className={menuItemClass}>
              <Barcode className="size-3.5" />
              Gerar boleto
            </Menu.Item>
            <Menu.Item onClick={() => {}} className={menuItemClass}>
              <QrCode className="size-3.5" />
              Gerar pix
            </Menu.Item>
            <Menu.Item onClick={() => {}} className={menuItemClass}>
              <RefreshCw className="size-3.5" />
              Alterar status
            </Menu.Item>
            <Menu.Item onClick={() => {}} className={menuItemClass}>
              <Paperclip className="size-3.5" />
              {invoice.hasAttachment ? "Ver anexo" : "Anexar fatura"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function formatReference(invoice: Invoice) {
  if (!invoice.referenceMonth) return "Pagamento único";
  const [year, month] = invoice.referenceMonth.split("-");
  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const STATUS_DOT: Record<InvoiceStatus, string> = {
  pendente: "bg-warning",
  paga: "bg-success",
  atrasada: "bg-destructive",
};

function StatusDot({ className }: { className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} />;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos os status", icon: <StatusDot className="bg-muted-foreground/40" /> },
  { value: "pendente", label: INVOICE_STATUS_LABEL.pendente, icon: <StatusDot className={STATUS_DOT.pendente} /> },
  { value: "paga", label: INVOICE_STATUS_LABEL.paga, icon: <StatusDot className={STATUS_DOT.paga} /> },
  { value: "atrasada", label: INVOICE_STATUS_LABEL.atrasada, icon: <StatusDot className={STATUS_DOT.atrasada} /> },
];

// Ordem de urgência, não alfabética: o que precisa de ação vem primeiro.
const STATUS_SORT_WEIGHT: Record<InvoiceStatus, number> = { pendente: 0, atrasada: 1, paga: 2 };
const PAYMENT_METHOD_SORT_WEIGHT: Record<PaymentMethod, number> = { boleto: 0, pix: 1 };

const COLUMNS: Column<Invoice>[] = [
  {
    key: "month",
    header: "Referência",
    sortValue: effectiveMonth,
    cell: formatReference,
  },
  {
    key: "amount",
    header: "Valor",
    sortValue: (invoice) => invoice.amount,
    cell: (invoice) => (
      <span className="inline-flex items-center gap-1.5">
        <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
        {formatCurrency(invoice.amount, invoice.currency)}
      </span>
    ),
  },
  {
    key: "paymentMethod",
    header: "Método",
    sortValue: (invoice) =>
      invoice.paymentMethod ? PAYMENT_METHOD_SORT_WEIGHT[invoice.paymentMethod] : -1,
    cell: (invoice) => {
      const MethodIcon = invoice.paymentMethod ? PAYMENT_METHOD_ICON[invoice.paymentMethod] : CreditCard;
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MethodIcon className="size-3.5 shrink-0" />
          {invoice.paymentMethod ? PAYMENT_METHOD_LABEL[invoice.paymentMethod] : "Não definido"}
          {invoice.paidAt && ` (${formatDateTime(invoice.paidAt)})`}
        </span>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    sortValue: (invoice) => STATUS_SORT_WEIGHT[invoice.status],
    cell: (invoice) => (
      <Badge variant={STATUS_VARIANT[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "w-10 text-right",
    cell: (invoice) => <InvoiceActionsMenu invoice={invoice} />,
  },
];

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const [status, setStatus] = useState<InvoiceStatus | "todos">("todos");
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");

  const filtered = filterInvoices(invoices, { status, monthFrom, monthTo });

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-44">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as InvoiceStatus | "todos")}
            options={STATUS_OPTIONS}
          />
        </div>
        <MonthPicker aria-label="De" placeholder="De" value={monthFrom} onChange={setMonthFrom} />
        <MonthPicker aria-label="Até" placeholder="Até" value={monthTo} onChange={setMonthTo} />
      </div>

      <DataTable
        data={filtered}
        columns={COLUMNS}
        rowKey={(invoice) => invoice.id}
        emptyMessage="Nenhuma fatura encontrada com esses filtros."
      />
    </div>
  );
}
