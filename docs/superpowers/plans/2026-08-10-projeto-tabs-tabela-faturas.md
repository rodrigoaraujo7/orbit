# Tabs Financeiro/Ferramentas + tabela de faturas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar a tela de projeto em abas Financeiro/Ferramentas e trocar a lista de faturas por uma tabela com filtro (status + mês), ordenação de coluna única e paginação — usando uma base de tabela/paginação reaproveitável pro resto do projeto.

**Architecture:** Lógica pura (paginação, filtro/ordenação de faturas) fica em `src/lib/*.ts`, sem depender de React, pra poder ter self-check `node --experimental-strip-types`. Componentes de UI (`Tabs`, `Table`, `Pagination`) ficam genéricos em `components/ui/`. `InvoicesTable` compõe tudo isso especificamente para faturas.

**Tech Stack:** React 19, TanStack Router, `@base-ui/react` (Tabs — já instalado), Tailwind, TypeScript. Sem framework de teste no projeto — self-checks seguem o padrão existente de `src/lib/project-schema.check.ts` (script com asserts, `node --experimental-strip-types`).

## Global Constraints

- `DEFAULT_PAGE_SIZE = 10` — tamanho de página padrão de toda tabela do projeto (spec, decisão de paginação).
- Sem lib nova: `@base-ui/react` já tem `Tabs`; tabela é HTML `<table>` estilizado.
- Filtro de mês compara contra `referenceMonth ?? generatedAt.slice(0, 7)` (spec — cobre deal à vista sem `referenceMonth`).
- Ordenação é coluna única (asc → desc → nenhuma), sem multi-sort.
- Aba Ferramentas: nenhuma mudança de componente/lógica, só reposicionamento no layout.
- `InvoiceCard` e seu menu de ações ficam obsoletos e devem ser removidos (sem código morto).

---

### Task 1: `usePagination` — lógica de paginação reaproveitável

**Files:**
- Create: `src/lib/pagination.ts`
- Create: `src/lib/pagination.check.ts`
- Modify: `package.json:8` (novo script `check:pagination`)

**Interfaces:**
- Produces: `DEFAULT_PAGE_SIZE: number`; `paginate<T>(items: T[], page: number, pageSize: number): { pageItems: T[]; pageCount: number; page: number }` (pura, sem React — `page` retornado já é clampado); `usePagination<T>(items: T[], pageSize?: number): { pageItems: T[]; pageCount: number; page: number; setPage: (page: number) => void }` (hook, usa `paginate` por trás).

- [ ] **Step 1: Escrever `paginate` e `usePagination`**

```ts
// src/lib/pagination.ts
import { useState } from "react"

export const DEFAULT_PAGE_SIZE = 10

/**
 * Fatia `items` pra página pedida. Pura — sem depender de estado do React —
 * pra dar pra rodar num self-check de node (ver pagination.check.ts) e ser
 * reaproveitada por qualquer tabela do projeto.
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize
  return { pageItems: items.slice(start, start + pageSize), pageCount, page: safePage }
}

/** Estado de página + fatia atual. `pageSize` fixo em `DEFAULT_PAGE_SIZE` por padrão. */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  return { ...paginate(items, page, pageSize), setPage }
}
```

- [ ] **Step 2: Self-check da lógica pura**

```ts
// src/lib/pagination.check.ts
/**
 * Self-check de `paginate` (ver pagination.ts). Roda com: pnpm check:pagination
 */
import { paginate } from "./pagination.ts"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`esperado ${e}, recebido ${a}`)
  },
}

const items = Array.from({ length: 25 }, (_, i) => i + 1)

// página 1 de 3 (25 itens, 10 por página)
assert.deepEqual(paginate(items, 1, 10), {
  pageItems: items.slice(0, 10),
  pageCount: 3,
  page: 1,
})

// última página, parcial
assert.deepEqual(paginate(items, 3, 10), {
  pageItems: items.slice(20, 25),
  pageCount: 3,
  page: 3,
})

// página além do total clampa pra última existente
assert.deepEqual(paginate(items, 99, 10), {
  pageItems: items.slice(20, 25),
  pageCount: 3,
  page: 3,
})

// página abaixo de 1 clampa pra 1
assert.deepEqual(paginate(items, 0, 10), {
  pageItems: items.slice(0, 10),
  pageCount: 3,
  page: 1,
})

// lista vazia: 1 página vazia, nunca zero páginas
assert.deepEqual(paginate([], 1, 10), { pageItems: [], pageCount: 1, page: 1 })

console.log("pagination: todos os checks passaram")
```

- [ ] **Step 3: Rodar o self-check**

Adicionar em `package.json`, junto de `check:schema`:

```json
"check:pagination": "node --experimental-strip-types src/lib/pagination.check.ts",
```

Run: `pnpm check:pagination`
Expected: `pagination: todos os checks passaram`

- [ ] **Step 4: Commit**

```bash
git add src/lib/pagination.ts src/lib/pagination.check.ts package.json
git commit -m "feat: paginação reaproveitável (paginate + usePagination)"
```

---

### Task 2: Primitivas de `Table` e `Pagination` (UI)

**Files:**
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/pagination.tsx`

**Interfaces:**
- Consumes: `usePagination` de Task 1 — `{ pageItems, pageCount, page, setPage }` só pro componente `Pagination` (recebe `page`, `pageCount`, `onPageChange` como props, não importa o hook direto).
- Produces: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (`table.tsx`); `Pagination` (`pagination.tsx`) com props `{ page: number; pageCount: number; onPageChange: (page: number) => void }`.

- [ ] **Step 1: Primitivas de tabela**

```tsx
// src/components/ui/table.tsx
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-muted/50", className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y", className)} {...props} />
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-muted/30", className)} {...props} />
}

type SortDirection = "asc" | "desc" | null

export function TableHead({
  className,
  sortDirection,
  onSort,
  children,
  ...props
}: React.ComponentProps<"th"> & {
  sortDirection?: SortDirection
  onSort?: () => void
}) {
  if (!onSort) {
    return (
      <th
        className={cn(
          "px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase",
          className
        )}
        {...props}
      >
        {children}
      </th>
    )
  }

  const SortIcon =
    sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown

  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        {children}
        <SortIcon className="size-3" />
      </button>
    </th>
  )
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />
}
```

- [ ] **Step 2: Controles de paginação**

```tsx
// src/components/ui/pagination.tsx
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <div className="flex items-center justify-end gap-2 px-1 py-2">
      <span className="text-xs text-muted-foreground">
        Página {page} de {pageCount}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/table.tsx src/components/ui/pagination.tsx
git commit -m "feat: primitivas de Table e Pagination reaproveitáveis"
```

---

### Task 3: `Tabs` (UI)

**Files:**
- Create: `src/components/ui/tabs.tsx`

**Interfaces:**
- Produces: `Tabs` (= `Tabs.Root`), `TabsList`, `TabsTab`, `TabsPanel`, todos re-exportados/estilizados, mesmo padrão de composição do `select.tsx`/`row-actions-menu.tsx` (usam `@base-ui/react` por baixo).

- [ ] **Step 1: Wrapper estilizado**

```tsx
// src/components/ui/tabs.tsx
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex items-center gap-1 border-b", className)}
      {...props}
    />
  )
}

export function TabsTab({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors select-none",
        "hover:text-foreground",
        "data-selected:border-primary data-selected:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  )
}

export function TabsPanel({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return <TabsPrimitive.Panel className={cn("outline-none", className)} {...props} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/tabs.tsx
git commit -m "feat: componente Tabs reaproveitável (base-ui)"
```

---

### Task 4: Lógica pura de filtro/ordenação de faturas

**Files:**
- Create: `src/lib/invoice-table.ts`
- Create: `src/lib/invoice-table.check.ts`
- Modify: `package.json:8` (novo script `check:invoice-table`)

**Interfaces:**
- Consumes: `Invoice`, `InvoiceStatus` de `@/data/projects` (já existem, ver `src/data/projects.ts:104-123`).
- Produces: `type InvoiceSortKey = "amount" | "month" | "paymentMethod" | "status"`; `type SortDirection = "asc" | "desc"`; `effectiveMonth(invoice: Invoice): string`; `filterInvoices(invoices: Invoice[], filters: { status: InvoiceStatus | "todos"; monthFrom: string; monthTo: string }): Invoice[]`; `sortInvoices(invoices: Invoice[], sortKey: InvoiceSortKey | null, direction: SortDirection): Invoice[]`.

- [ ] **Step 1: Implementar**

```ts
// src/lib/invoice-table.ts
import type { Invoice, InvoiceStatus } from "@/data/projects"

export type InvoiceSortKey = "amount" | "month" | "paymentMethod" | "status"
export type SortDirection = "asc" | "desc"

/**
 * "Mês efetivo" da fatura pra filtro de data: `referenceMonth` quando existe
 * (deal parcelado); senão cai pra `generatedAt` truncado em "YYYY-MM" — é o
 * caso do deal à vista, que não tem parcela/mês de referência.
 */
export function effectiveMonth(invoice: Invoice): string {
  return invoice.referenceMonth ?? invoice.generatedAt.slice(0, 7)
}

export function filterInvoices(
  invoices: Invoice[],
  filters: { status: InvoiceStatus | "todos"; monthFrom: string; monthTo: string }
): Invoice[] {
  return invoices.filter((invoice) => {
    if (filters.status !== "todos" && invoice.status !== filters.status) return false
    const month = effectiveMonth(invoice)
    if (filters.monthFrom && month < filters.monthFrom) return false
    if (filters.monthTo && month > filters.monthTo) return false
    return true
  })
}

const PAYMENT_METHOD_SORT_WEIGHT: Record<string, number> = { boleto: 0, pix: 1 }
const STATUS_SORT_WEIGHT: Record<InvoiceStatus, number> = { pendente: 0, atrasada: 1, paga: 2 }

function sortValue(invoice: Invoice, key: InvoiceSortKey): number | string {
  switch (key) {
    case "amount":
      return invoice.amount
    case "month":
      return effectiveMonth(invoice)
    case "paymentMethod":
      return invoice.paymentMethod ? PAYMENT_METHOD_SORT_WEIGHT[invoice.paymentMethod] : -1
    case "status":
      return STATUS_SORT_WEIGHT[invoice.status]
  }
}

/** `sortKey: null` devolve a ordem original (sem cópia extra além do slice). */
export function sortInvoices(
  invoices: Invoice[],
  sortKey: InvoiceSortKey | null,
  direction: SortDirection
): Invoice[] {
  if (!sortKey) return invoices
  const factor = direction === "asc" ? 1 : -1
  return [...invoices].sort((a, b) => {
    const va = sortValue(a, sortKey)
    const vb = sortValue(b, sortKey)
    if (va < vb) return -1 * factor
    if (va > vb) return 1 * factor
    return 0
  })
}
```

- [ ] **Step 2: Self-check**

```ts
// src/lib/invoice-table.check.ts
/**
 * Self-check de filtro/ordenação de faturas (ver invoice-table.ts).
 * Roda com: pnpm check:invoice-table
 */
import { effectiveMonth, filterInvoices, sortInvoices } from "./invoice-table.ts"
import type { Invoice } from "@/data/projects"

const assert = {
  deepEqual(actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a !== e) throw new Error(`esperado ${e}, recebido ${a}`)
  },
}

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    amount: 100,
    status: "pendente",
    generatedAt: "2026-01-05",
    payerName: "Cliente",
    hasAttachment: false,
    currency: "BRL",
    ...overrides,
  }
}

// mês efetivo: usa referenceMonth quando existe
assert.deepEqual(effectiveMonth(invoice({ referenceMonth: "2026-03" })), "2026-03")
// deal à vista: sem referenceMonth, cai pro mês de generatedAt
assert.deepEqual(effectiveMonth(invoice({ generatedAt: "2026-01-05" })), "2026-01")

const jan = invoice({ id: "jan", referenceMonth: "2026-01", status: "paga" })
const feb = invoice({ id: "feb", referenceMonth: "2026-02", status: "pendente" })
const mar = invoice({ id: "mar", referenceMonth: "2026-03", status: "atrasada" })
const list = [jan, feb, mar]

// filtro de status
assert.deepEqual(
  filterInvoices(list, { status: "pendente", monthFrom: "", monthTo: "" }).map((i) => i.id),
  ["feb"]
)
assert.deepEqual(
  filterInvoices(list, { status: "todos", monthFrom: "", monthTo: "" }).map((i) => i.id),
  ["jan", "feb", "mar"]
)

// filtro de mês (intervalo)
assert.deepEqual(
  filterInvoices(list, { status: "todos", monthFrom: "2026-02", monthTo: "2026-03" }).map(
    (i) => i.id
  ),
  ["feb", "mar"]
)

// ordenação por valor, asc/desc
const byAmount = [invoice({ id: "a", amount: 30 }), invoice({ id: "b", amount: 10 }), invoice({ id: "c", amount: 20 })]
assert.deepEqual(
  sortInvoices(byAmount, "amount", "asc").map((i) => i.id),
  ["b", "c", "a"]
)
assert.deepEqual(
  sortInvoices(byAmount, "amount", "desc").map((i) => i.id),
  ["a", "c", "b"]
)

// sortKey null devolve ordem original, sem mutar o array de entrada
assert.deepEqual(sortInvoices(list, null, "asc").map((i) => i.id), ["jan", "feb", "mar"])
assert.deepEqual(list.map((i) => i.id), ["jan", "feb", "mar"])

console.log("invoice-table: todos os checks passaram")
```

- [ ] **Step 3: Rodar o self-check**

Adicionar em `package.json`:

```json
"check:invoice-table": "node --experimental-strip-types src/lib/invoice-table.check.ts",
```

Run: `pnpm check:invoice-table`
Expected: `invoice-table: todos os checks passaram`

- [ ] **Step 4: Commit**

```bash
git add src/lib/invoice-table.ts src/lib/invoice-table.check.ts package.json
git commit -m "feat: filtro e ordenação puros de faturas"
```

---

### Task 5: `InvoicesTable` (componente) e remoção de `InvoiceCard`

**Files:**
- Create: `src/components/projetos/invoices-table.tsx`
- Delete: `src/components/projetos/invoice-card.tsx`

**Interfaces:**
- Consumes: `usePagination` (Task 1), `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` e `Pagination` (Task 2), `filterInvoices`/`sortInvoices`/`InvoiceSortKey`/`SortDirection` (Task 4), `Select`/`SelectOption` (`@/components/ui/select.tsx`), `INVOICE_STATUS_LABEL`/`PAYMENT_METHOD_LABEL`/`Invoice`/`InvoiceStatus` (`@/data/projects`), `formatCurrency`/`formatDateTime` (`@/lib/format`).
- Produces: `InvoicesTable({ invoices }: { invoices: Invoice[] })` — export default de uso único, monta filtros + tabela + paginação.

- [ ] **Step 1: Implementar o componente**

```tsx
// src/components/projetos/invoices-table.tsx
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
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Select, type SelectOption } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/data/projects"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { filterInvoices, sortInvoices, type InvoiceSortKey, type SortDirection } from "@/lib/invoice-table"
import { usePagination } from "@/lib/pagination"

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof Barcode> = {
  boleto: Barcode,
  pix: QrCode,
}

const STATUS_VARIANT: Record<InvoiceStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  pendente: "warning",
  paga: "success",
  atrasada: "destructive",
}

const menuItemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"

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
  )
}

function formatReference(invoice: Invoice) {
  if (!invoice.referenceMonth) return "Pagamento único"
  const [year, month] = invoice.referenceMonth.split("-")
  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos os status" },
  { value: "pendente", label: INVOICE_STATUS_LABEL.pendente },
  { value: "paga", label: INVOICE_STATUS_LABEL.paga },
  { value: "atrasada", label: INVOICE_STATUS_LABEL.atrasada },
]

const COLUMNS: { key: InvoiceSortKey; label: string }[] = [
  { key: "month", label: "Referência" },
  { key: "amount", label: "Valor" },
  { key: "paymentMethod", label: "Método" },
  { key: "status", label: "Status" },
]

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const [status, setStatus] = useState<InvoiceStatus | "todos">("todos")
  const [monthFrom, setMonthFrom] = useState("")
  const [monthTo, setMonthTo] = useState("")
  const [sortKey, setSortKey] = useState<InvoiceSortKey | null>(null)
  const [direction, setDirection] = useState<SortDirection>("asc")

  function toggleSort(key: InvoiceSortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setDirection("asc")
    } else if (direction === "asc") {
      setDirection("desc")
    } else {
      setSortKey(null)
    }
  }

  const filtered = filterInvoices(invoices, { status, monthFrom, monthTo })
  const sorted = sortInvoices(filtered, sortKey, direction)
  const { pageItems, page, pageCount, setPage } = usePagination(sorted)

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as InvoiceStatus | "todos")}
            options={STATUS_OPTIONS}
          />
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          De
          <input
            type="month"
            value={monthFrom}
            onChange={(e) => setMonthFrom(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Até
          <input
            type="month"
            value={monthTo}
            onChange={(e) => setMonthTo(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma fatura encontrada com esses filtros.
        </p>
      ) : (
        <>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.key}
                    sortDirection={sortKey === column.key ? direction : null}
                    onSort={() => toggleSort(column.key)}
                  >
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((invoice) => {
                const MethodIcon = invoice.paymentMethod
                  ? PAYMENT_METHOD_ICON[invoice.paymentMethod]
                  : CreditCard
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatReference(invoice)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MethodIcon className="size-3.5 shrink-0" />
                        {invoice.paymentMethod
                          ? PAYMENT_METHOD_LABEL[invoice.paymentMethod]
                          : "Não definido"}
                        {invoice.paidAt && ` (${formatDateTime(invoice.paidAt)})`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[invoice.status]}>
                        {INVOICE_STATUS_LABEL[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <InvoiceActionsMenu invoice={invoice} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Remover o componente antigo**

```bash
rm src/components/projetos/invoice-card.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A src/components/projetos/invoices-table.tsx src/components/projetos/invoice-card.tsx
git commit -m "feat: tabela de faturas com filtro, ordenação e paginação"
```

---

### Task 6: Tabs na tela de projeto

**Files:**
- Modify: `src/routes/projetos.$projectId.tsx`

**Interfaces:**
- Consumes: `Tabs`/`TabsList`/`TabsTab`/`TabsPanel` (Task 3), `InvoicesTable` (Task 5).

- [ ] **Step 1: Trocar import de `InvoiceCard` por `InvoicesTable` e importar `Tabs`**

Em `src/routes/projetos.$projectId.tsx:9`, trocar:

```ts
import { InvoiceCard } from "@/components/projetos/invoice-card"
```

por:

```ts
import { InvoicesTable } from "@/components/projetos/invoices-table"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
```

- [ ] **Step 2: Substituir o grid de dois cards pelas tabs**

Trocar o bloco (linhas 216–295 no arquivo atual, do `<div className="grid gap-4 ...">` até o `</div>` que fecha):

```tsx
      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card
          title="Valor fechado"
          ...
        >
          ...
          {invoices.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <InvoiceCard invoice={invoice} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Ferramentas"
          ...
        >
          ...
        </Card>
      </div>
```

por:

```tsx
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="financeiro">
          <TabsList>
            <TabsTab value="financeiro">Financeiro</TabsTab>
            <TabsTab value="ferramentas">Ferramentas</TabsTab>
          </TabsList>

          <TabsPanel value="financeiro" className="pt-4">
            <Card
              title="Valor fechado"
              action={
                <Tooltip label="Editar valor fechado" side="top">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setEditDialog({
                        sections: ["cobranca"],
                        title: "Editar valor fechado",
                        description: "Atualize o valor e a forma de cobrança.",
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                </Tooltip>
              }
            >
              <p className="text-2xl font-semibold tracking-tight">
                {isDealFree(deal) ? FREE_LABEL : formatCurrency(deal.amount, deal.currency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDealProgress(deal, invoices)}
              </p>

              {invoices.length > 0 && <InvoicesTable invoices={invoices} />}
            </Card>
          </TabsPanel>

          <TabsPanel value="ferramentas" className="pt-4">
            <Card
              title="Ferramentas"
              action={
                <Tooltip label="Editar ferramentas" side="top">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setEditDialog({
                        sections: ["ferramentas"],
                        title: "Editar ferramentas",
                        description: "Atualize as ferramentas usadas no projeto.",
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                </Tooltip>
              }
            >
              <p className="text-2xl font-semibold tracking-tight">
                {monthlyCostLabel ||
                  (paidTools.length > 0 ? "Sem cobrança mensal" : "Nenhuma ferramenta paga")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatToolsProgress(project.tools)}
              </p>

              {project.tools.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhuma ferramenta registrada.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col divide-y">
                  {project.tools.map((tool) => (
                    <ToolDetails key={`${tool.id}-${tool.name}`} tool={tool} />
                  ))}
                </ul>
              )}
            </Card>
          </TabsPanel>
        </Tabs>
      </div>
```

Nota: o conteúdo interno de cada `Card` é *exatamente* o que já existia — só moveu de lugar (grid → dentro da `TabsPanel` correspondente) e, no caso do Financeiro, a lista `<ul>` de faturas virou `<InvoicesTable invoices={invoices} />`.

- [ ] **Step 3: Rodar o build/typecheck**

Run: `pnpm build`
Expected: build passa sem erro de tipo (confirma que não sobrou import morto de `InvoiceCard` nem prop divergente).

- [ ] **Step 4: Verificação visual**

Run: `pnpm dev` e abrir `/projetos/<id de um projeto com deal parcelado>` no navegador (ou usar a skill `run` do projeto, se configurada).
Expected: duas abas Financeiro/Ferramentas; aba Financeiro mostra a tabela de faturas com filtros, sort ao clicar no header, paginação se houver mais de 10 faturas; aba Ferramentas idêntica à tela atual.

- [ ] **Step 5: Commit**

```bash
git add src/routes/projetos.\$projectId.tsx
git commit -m "feat: tabs Financeiro/Ferramentas na tela de projeto"
```

---

## Self-Review (already applied)

- **Spec coverage:** tabs (Task 6) · tabela em vez de lista (Task 5) · filtro de data e status (Task 4+5) · ordenação de valor/data/método/status (Task 4+5) · paginação padrão do projeto (Task 1+2) · 3 pontinhos mantidos (Task 5, `InvoiceActionsMenu` idêntico) · aba Ferramentas sem alteração de componente (Task 6, conteúdo copiado tal qual).
- **Placeholder scan:** nenhum "TBD"/"similar to" — cada step tem código completo.
- **Type consistency:** `InvoiceSortKey`/`SortDirection` definidos em Task 4 e usados com os mesmos nomes em Task 5; `usePagination`/`Pagination` de Tasks 1–2 usados com os mesmos nomes de propriedade (`pageItems`, `pageCount`, `page`, `setPage`) em Task 5.
