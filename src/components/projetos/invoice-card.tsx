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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/data/projects"
import { formatCurrency, formatDateTime } from "@/lib/format"

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof Barcode> = {
  boleto: Barcode,
  pix: QrCode,
}

const STATUS_VARIANT: Record<
  InvoiceStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pendente: "warning",
  paga: "success",
  atrasada: "destructive",
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {INVOICE_STATUS_LABEL[status]}
    </Badge>
  )
}

const menuItemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"

// Compartilhar/gerar boleto/pix/alterar status/anexar ainda não fazem nada —
// sem API de faturas por enquanto, os itens são só UI.
function InvoiceActionsMenu({ invoice }: { invoice: Invoice }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Mais ações" />
        }
      >
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
  )
}

function formatReference(invoice: Invoice) {
  if (!invoice.referenceMonth) return "Pagamento único"
  const [year, month] = invoice.referenceMonth.split("-")
  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" }
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const MethodIcon = invoice.paymentMethod
    ? PAYMENT_METHOD_ICON[invoice.paymentMethod]
    : CreditCard

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{formatReference(invoice)}</span>
        <div className="flex items-center gap-1">
          <InvoiceStatusBadge status={invoice.status} />
          <InvoiceActionsMenu invoice={invoice} />
        </div>
      </div>

      <dl className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Wallet className="size-3.5 shrink-0" />
          <dt className="sr-only">Valor</dt>
          <dd>{formatCurrency(invoice.amount, invoice.currency)}</dd>
        </div>
        <span aria-hidden="true">·</span>
        <div className="flex items-center gap-1.5">
          <MethodIcon className="size-3.5 shrink-0" />
          <dt className="sr-only">Método</dt>
          <dd>
            {invoice.paymentMethod
              ? PAYMENT_METHOD_LABEL[invoice.paymentMethod]
              : "Não definido"}
            {invoice.paidAt && ` (${formatDateTime(invoice.paidAt)})`}
          </dd>
        </div>
      </dl>
    </div>
  )
}
