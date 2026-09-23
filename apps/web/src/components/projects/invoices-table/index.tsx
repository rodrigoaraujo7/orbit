import { Menu } from "@base-ui/react/menu"
import {
  Barcode,
  CreditCard,
  MoreVertical,
  Paperclip,
  QrCode,
  RefreshCw,
  Share2,
  Wallet,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, type SelectOption } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/table"
import { FilterPending, TableFilterSkeleton } from "@/components/ui/filter-pending"
import { type Invoice, type InvoiceStatus, type PaymentMethod } from "@/data/projects"
import { getLocale } from "@/i18n"
import { invoiceStatusLabel, paymentMethodLabel } from "@/i18n/labels"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { effectiveMonth } from "shared"
import { cn } from "@/lib/utils"

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof Barcode> = {
  boleto: Barcode,
  pix: QrCode,
}

const STATUS_VARIANT: Record<InvoiceStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  paid: "success",
  overdue: "destructive",
}

const menuItemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50"

// Share/generate boleto/pix/change status/attach are not wired to the API yet,
// so the items stay visible but disabled.
function InvoiceActionsMenu({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation()
  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t("common.moreActions")} />}
      >
        <MoreVertical />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-[60]">
          <Menu.Popup className="min-w-44 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.Item disabled className={menuItemClass}>
              <Share2 className="size-3.5" />
              {t("invoice.share")}
            </Menu.Item>
            <Menu.Item disabled className={menuItemClass}>
              <Barcode className="size-3.5" />
              {t("invoice.generateBoleto")}
            </Menu.Item>
            <Menu.Item disabled className={menuItemClass}>
              <QrCode className="size-3.5" />
              {t("invoice.generatePix")}
            </Menu.Item>
            <Menu.Item disabled className={menuItemClass}>
              <RefreshCw className="size-3.5" />
              {t("invoice.changeStatus")}
            </Menu.Item>
            <Menu.Item disabled className={menuItemClass}>
              <Paperclip className="size-3.5" />
              {invoice.hasAttachment ? t("invoice.viewAttachment") : t("invoice.attachInvoice")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

const STATUS_DOT: Record<InvoiceStatus, string> = {
  pending: "bg-warning",
  paid: "bg-success",
  overdue: "bg-destructive",
}

function StatusDot({ className }: { className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} />
}

// Urgency order, not alphabetical: whatever needs action comes first.
const STATUS_SORT_WEIGHT: Record<InvoiceStatus, number> = { pending: 0, overdue: 1, paid: 2 }
const PAYMENT_METHOD_SORT_WEIGHT: Record<PaymentMethod, number> = { boleto: 0, pix: 1 }

export function InvoicesTable({
  invoices,
  status,
  monthFrom,
  monthTo,
  onStatusChange,
  onMonthFromChange,
  onMonthToChange,
  isPending,
  isFetching,
}: {
  invoices: Invoice[]
  status: InvoiceStatus | "all"
  monthFrom: string
  monthTo: string
  onStatusChange: (status: InvoiceStatus | "all") => void
  onMonthFromChange: (value: string) => void
  onMonthToChange: (value: string) => void
  isPending: boolean
  isFetching: boolean
}) {
  const { t } = useTranslation()

  function formatReference(invoice: Invoice) {
    if (!invoice.referenceMonth) return t("invoice.oneOffPayment")
    const [year, month] = invoice.referenceMonth.split("-")
    const label = new Date(Number(year), Number(month) - 1).toLocaleDateString(getLocale(), {
      month: "long",
      year: "numeric",
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const STATUS_OPTIONS: SelectOption[] = [
    {
      value: "all",
      label: t("invoice.allStatuses"),
      icon: <StatusDot className="bg-muted-foreground/40" />,
    },
    {
      value: "pending",
      label: invoiceStatusLabel("pending"),
      icon: <StatusDot className={STATUS_DOT.pending} />,
    },
    {
      value: "paid",
      label: invoiceStatusLabel("paid"),
      icon: <StatusDot className={STATUS_DOT.paid} />,
    },
    {
      value: "overdue",
      label: invoiceStatusLabel("overdue"),
      icon: <StatusDot className={STATUS_DOT.overdue} />,
    },
  ]

  const COLUMNS: Column<Invoice>[] = [
    {
      key: "month",
      header: t("common.reference"),
      sortValue: effectiveMonth,
      cell: formatReference,
    },
    {
      key: "amount",
      header: t("common.value"),
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
      header: t("common.method"),
      sortValue: (invoice) =>
        invoice.paymentMethod ? PAYMENT_METHOD_SORT_WEIGHT[invoice.paymentMethod] : -1,
      cell: (invoice) => {
        const MethodIcon = invoice.paymentMethod
          ? PAYMENT_METHOD_ICON[invoice.paymentMethod]
          : CreditCard
        return (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MethodIcon className="size-3.5 shrink-0" />
            {invoice.paymentMethod
              ? paymentMethodLabel(invoice.paymentMethod)
              : t("invoice.undefinedMethod")}
            {invoice.paidAt && ` (${formatDateTime(invoice.paidAt)})`}
          </span>
        )
      },
    },
    {
      key: "status",
      header: t("common.status"),
      sortValue: (invoice) => STATUS_SORT_WEIGHT[invoice.status],
      cell: (invoice) => (
        <Badge variant={STATUS_VARIANT[invoice.status]}>{invoiceStatusLabel(invoice.status)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      cell: (invoice) => <InvoiceActionsMenu invoice={invoice} />,
    },
  ]

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-44">
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as InvoiceStatus | "all")}
            options={STATUS_OPTIONS}
          />
        </div>
        <MonthPicker
          aria-label={t("common.from")}
          placeholder={t("common.from")}
          value={monthFrom}
          onChange={onMonthFromChange}
        />
        <MonthPicker
          aria-label={t("common.to")}
          placeholder={t("common.to")}
          value={monthTo}
          onChange={onMonthToChange}
        />
      </div>

      <FilterPending
        isPending={isPending}
        isFetching={isFetching}
        skeleton={<TableFilterSkeleton rows={5} />}
      >
        <DataTable
          data={invoices}
          columns={COLUMNS}
          rowKey={(invoice) => invoice.id}
          emptyMessage={t("invoice.empty")}
        />
      </FilterPending>
    </div>
  )
}
