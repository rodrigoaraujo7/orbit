# Configurações + Cadastros Gerais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Configurações" page to the sidebar containing a "Cadastros gerais" tab where the user manages reusable Contacts and Custom tools (per `docs/superpowers/specs/2026-08-09-cadastros-gerais-design.md`).

**Architecture:** New `RegistryProvider` (in-memory context, same pattern as `ProjectsProvider`) holds `contacts` and `customTools`. A new `/settings` route renders an outer `Tabs` (room for future settings sections) with one tab, "Cadastros gerais", which itself renders an inner `Tabs` (Contatos / Ferramentas customizadas). Each inner tab is a dense `DataTable` + a create `Dialog`, mirroring the Projects page's table/dialog/confirm-delete pattern exactly.

**Tech Stack:** React 19, TanStack Router (file-based routes), react-hook-form + zod, Base UI (`Dialog`, `Tabs`), existing `DataTable`/`Field`/`Select`/`ConfirmDialog` components.

## Global Constraints

- No persistence — same limitation as `ProjectsProvider`, state resets on reload.
- No edit, only create + delete (v1 scope, matches the Projects page's current level of finish per the spec).
- Custom tools without a matching icon fall back to the generic `Wrench` icon `ToolIcon` already renders for unknown ids — no icon picker.
- Scope is the "Cadastros Gerais" screen only. The `Project.client: string` → `clientId` migration and the `ToolSelect` merge with custom tools are explicitly deferred by the spec's own "Riscos" section — not part of this plan.
- All new UI copy in pt-BR, matching the rest of the app.

---

## File Structure

- `src/data/contacts.ts` — `Contact` type (new data module, same role as `data/projects.ts`).
- `src/data/custom-tools.ts` — `CustomTool` type (references `ToolCategory` from `tool-catalog.ts`).
- `src/lib/registry-store.tsx` — `RegistryProvider`/`useRegistry()`, same shape as `lib/projects-store.tsx`.
- `src/components/layout/sidebar-nav.tsx` — add the "Configurações" nav item.
- `src/routes/__root.tsx` — mount `RegistryProvider`.
- `src/components/settings/create-contact-dialog.tsx` — create-contact form dialog.
- `src/components/settings/contacts-panel.tsx` — Contatos table + create/delete wiring.
- `src/components/settings/create-custom-tool-dialog.tsx` — create-custom-tool form dialog.
- `src/components/settings/custom-tools-panel.tsx` — Ferramentas customizadas table + create/delete wiring.
- `src/components/settings/general-registry.tsx` — inner Tabs (Contatos / Ferramentas customizadas).
- `src/routes/settings.tsx` — `/settings` route: outer Tabs with the "Cadastros gerais" tab.

No existing files are restructured — everything above is either a new file or a small, additive edit.

---

### Task 1: Registry data types and store

**Files:**
- Create: `src/data/contacts.ts`
- Create: `src/data/custom-tools.ts`
- Create: `src/lib/registry-store.tsx`
- Modify: `src/routes/__root.tsx`

**Interfaces:**
- Produces: `Contact = { id: string; name: string; email?: string; phone?: string; company?: string }`
- Produces: `CustomTool = { id: string; name: string; category: ToolCategory }`
- Produces: `useRegistry(): { contacts: Contact[]; addContact: (c: Contact) => void; removeContact: (id: string) => void; customTools: CustomTool[]; addCustomTool: (t: CustomTool) => void; removeCustomTool: (id: string) => void }`
- Produces: `RegistryProvider({ children })` — must wrap the app in `__root.tsx` for `useRegistry()` to work anywhere.

- [ ] **Step 1: Create the data types**

`src/data/contacts.ts`:

```ts
export type Contact = {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
}
```

`src/data/custom-tools.ts`:

```ts
import type { ToolCategory } from "./tool-catalog"

/**
 * Same shape as `CatalogTool` (tool-catalog.ts), but lives in the registry
 * store instead of the static catalog — it's user data, not app data.
 */
export type CustomTool = {
  id: string
  name: string
  category: ToolCategory
}
```

- [ ] **Step 2: Create the store**

`src/lib/registry-store.tsx`:

```tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { Contact } from "@/data/contacts"
import type { CustomTool } from "@/data/custom-tools"

type RegistryContextValue = {
  contacts: Contact[]
  addContact: (contact: Contact) => void
  removeContact: (id: string) => void
  customTools: CustomTool[]
  addCustomTool: (tool: CustomTool) => void
  removeCustomTool: (id: string) => void
}

const RegistryContext = createContext<RegistryContextValue | null>(null)

/**
 * ponytail: in-memory state, gone on reload — same limitation as
 * ProjectsProvider (projects-store.tsx). No API yet — once there is one,
 * swap for fetch/mutation keeping this same interface.
 */
export function RegistryProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [customTools, setCustomTools] = useState<CustomTool[]>([])

  const value = useMemo<RegistryContextValue>(
    () => ({
      contacts,
      addContact: (contact) =>
        setContacts((current) => [contact, ...current]),
      removeContact: (id) =>
        setContacts((current) => current.filter((c) => c.id !== id)),
      customTools,
      addCustomTool: (tool) =>
        setCustomTools((current) => [tool, ...current]),
      removeCustomTool: (id) =>
        setCustomTools((current) => current.filter((t) => t.id !== id)),
    }),
    [contacts, customTools]
  )

  return <RegistryContext value={value}>{children}</RegistryContext>
}

export function useRegistry() {
  const context = useContext(RegistryContext)
  if (!context) {
    throw new Error("useRegistry must be used inside <RegistryProvider>")
  }
  return context
}
```

- [ ] **Step 3: Mount the provider in `__root.tsx`**

In `src/routes/__root.tsx`, add the import and wrap `ProjectsProvider`:

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toast"
import { ProjectsProvider } from "@/lib/projects-store"
import { RegistryProvider } from "@/lib/registry-store"

export const Route = createRootRoute({
  component: () => (
    <RegistryProvider>
      <ProjectsProvider>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster />
      </ProjectsProvider>
    </RegistryProvider>
  ),
})
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors from the three new/edited files (the rest of the project may still show pre-existing state, but nothing new here — `__root.tsx`, `contacts.ts`, `custom-tools.ts`, `registry-store.tsx` all resolve cleanly).

- [ ] **Step 5: Commit**

```bash
git add src/data/contacts.ts src/data/custom-tools.ts src/lib/registry-store.tsx src/routes/__root.tsx
git commit -m "feat: adiciona RegistryProvider para contatos e ferramentas customizadas"
```

---

### Task 2: Sidebar nav item

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx`

**Interfaces:**
- Consumes: nothing new — pure nav config change.

- [ ] **Step 1: Add the "Configurações" entry**

In `src/components/layout/sidebar-nav.tsx`, add `Settings` to the lucide-react import and append the nav item after Financeiro:

```tsx
import { Link } from "@tanstack/react-router"
import { Columns3, FolderGit2, LayoutDashboard, Settings, Wallet } from "lucide-react"

import { Tooltip, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projetos", icon: FolderGit2 },
  { to: "/kanban", label: "Kanban", icon: Columns3 },
  { to: "/finance", label: "Financeiro", icon: Wallet },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const
```

(Rest of the file is unchanged.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: fails at this point because `/settings` isn't a known route yet (`to: "/settings"` doesn't satisfy TanStack Router's typed `Link`). That's expected — Task 6 adds the route and regenerates `routeTree.gen.ts`, which resolves this. Confirm the *only* new error is about the `/settings` path, nothing else broke.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar-nav.tsx
git commit -m "feat: adiciona item Configurações na sidebar"
```

---

### Task 3: Contacts — dialog and panel

**Files:**
- Create: `src/components/settings/create-contact-dialog.tsx`
- Create: `src/components/settings/contacts-panel.tsx`

**Interfaces:**
- Consumes: `useRegistry()` from Task 1 (`contacts`, `addContact`, `removeContact`), `Contact` type.
- Produces: `<CreateContactDialog open onOpenChange />`, `<ContactsPanel />` — both used by Task 5's `general-registry.tsx`.

- [ ] **Step 1: Create the dialog**

`src/components/settings/create-contact-dialog.tsx`:

```tsx
import { Dialog } from "@base-ui/react/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import type { Contact } from "@/data/contacts"
import { useRegistry } from "@/lib/registry-store"

const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Informe pelo menos 2 caracteres"),
    email: z.string().trim(),
    phone: z.string().trim(),
    company: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.email && !z.string().email().safeParse(values.email).success) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "E-mail inválido",
      })
    }
  })

type ContactFormValues = z.infer<typeof contactSchema>

const emptyContactForm: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
}

export function CreateContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addContact } = useRegistry()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyContactForm,
  })

  // the dialog stays mounted the whole time — clear the form every time it opens
  useEffect(() => {
    if (open) reset(emptyContactForm)
  }, [open, reset])

  const onSubmit = handleSubmit((values) => {
    const contact: Contact = {
      id: crypto.randomUUID(),
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      company: values.company || undefined,
    }
    try {
      addContact(contact)
      toast.add({ title: "Contato criado", type: "success" })
      onOpenChange(false)
    } catch {
      toast.add({ title: "Erro ao criar contato", type: "error" })
    }
  })

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                Novo contato
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                Cadastre um contato para reaproveitar em vários projetos.
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
            <Field label="Nome" error={errors.name?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register("name")}
                  placeholder="Marcelo Tavares"
                />
              )}
            </Field>

            <Field label="E-mail" error={errors.email?.message} hint="Opcional">
              {(props) => (
                <Input
                  {...props}
                  {...register("email")}
                  type="email"
                  placeholder="marcelo@empresa.com.br"
                />
              )}
            </Field>

            <Field label="Telefone" error={errors.phone?.message} hint="Opcional">
              {(props) => (
                <Input
                  {...props}
                  {...register("phone")}
                  placeholder="(11) 98765-4321"
                />
              )}
            </Field>

            <Field label="Empresa" error={errors.company?.message} hint="Opcional">
              {(props) => (
                <Input
                  {...props}
                  {...register("company")}
                  placeholder="Empresa Ltda"
                />
              )}
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar contato</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Create the panel**

`src/components/settings/contacts-panel.tsx`:

```tsx
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import type { Contact } from "@/data/contacts"
import { useRegistry } from "@/lib/registry-store"
import { CreateContactDialog } from "./create-contact-dialog"

export function ContactsPanel() {
  const { contacts, removeContact } = useRegistry()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: "Nome",
      sortValue: (contact) => contact.name,
      cell: (contact) => <span className="font-medium">{contact.name}</span>,
    },
    {
      key: "email",
      header: "E-mail",
      className: "hidden sm:table-cell",
      cell: (contact) =>
        contact.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "phone",
      header: "Telefone",
      className: "hidden md:table-cell",
      cell: (contact) =>
        contact.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "company",
      header: "Empresa",
      className: "hidden lg:table-cell",
      cell: (contact) =>
        contact.company ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (contact) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Excluir contato"
          onClick={() => {
            setDeletingContact(contact)
            setDeleteDialogOpen(true)
          }}
        >
          <Trash2 />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus />
          Novo contato
        </Button>
      </div>

      <DataTable
        data={contacts}
        columns={columns}
        rowKey={(contact) => contact.id}
        initialSort={{ key: "name", direction: "asc" }}
        emptyMessage="Nenhum contato cadastrado."
      />

      <CreateContactDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir contato"
        description={
          <>
            Excluir{" "}
            <span className="font-medium text-primary">
              {deletingContact?.name}
            </span>
            ? Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!deletingContact) return
          try {
            removeContact(deletingContact.id)
            toast.add({ title: "Contato excluído", type: "success" })
          } catch {
            toast.add({ title: "Erro ao excluir contato", type: "error" })
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no new errors from these two files (the pre-existing `/settings` link error from Task 2 is still there, unrelated to this task).

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/create-contact-dialog.tsx src/components/settings/contacts-panel.tsx
git commit -m "feat: cadastro e listagem de contatos"
```

---

### Task 4: Custom tools — dialog and panel

**Files:**
- Create: `src/components/settings/create-custom-tool-dialog.tsx`
- Create: `src/components/settings/custom-tools-panel.tsx`

**Interfaces:**
- Consumes: `useRegistry()` from Task 1 (`customTools`, `addCustomTool`, `removeCustomTool`), `CustomTool` type, `TOOL_CATEGORY_LABEL`/`TOOL_CATEGORY_ORDER` from `data/tool-catalog.ts`.
- Produces: `<CreateCustomToolDialog open onOpenChange />`, `<CustomToolsPanel />` — both used by Task 5's `general-registry.tsx`.

- [ ] **Step 1: Create the dialog**

`src/components/settings/create-custom-tool-dialog.tsx`:

```tsx
import { Dialog } from "@base-ui/react/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import {
  TOOL_CATEGORY_LABEL,
  TOOL_CATEGORY_ORDER,
  type ToolCategory,
} from "@/data/tool-catalog"
import type { CustomTool } from "@/data/custom-tools"
import { useRegistry } from "@/lib/registry-store"

const categoryOptions = TOOL_CATEGORY_ORDER.map((category) => ({
  value: category,
  label: TOOL_CATEGORY_LABEL[category],
}))

const customToolSchema = z.object({
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres"),
  // kept as a plain string (not z.enum) so this doesn't have to duplicate
  // ToolCategory's literal union — the Select only ever offers valid
  // categories, so casting on submit is safe.
  category: z.string().min(1, "Selecione a categoria"),
})

type CustomToolFormValues = z.infer<typeof customToolSchema>

const emptyCustomToolForm: CustomToolFormValues = {
  name: "",
  category: TOOL_CATEGORY_ORDER[0],
}

export function CreateCustomToolDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addCustomTool } = useRegistry()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomToolFormValues>({
    resolver: zodResolver(customToolSchema),
    defaultValues: emptyCustomToolForm,
  })

  useEffect(() => {
    if (open) reset(emptyCustomToolForm)
  }, [open, reset])

  const onSubmit = handleSubmit((values) => {
    const tool: CustomTool = {
      id: crypto.randomUUID(),
      name: values.name,
      category: values.category as ToolCategory,
    }
    try {
      addCustomTool(tool)
      toast.add({ title: "Ferramenta criada", type: "success" })
      onOpenChange(false)
    } catch {
      toast.add({ title: "Erro ao criar ferramenta", type: "error" })
    }
  })

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                Nova ferramenta
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                Cadastre uma ferramenta fora do catálogo para reaproveitar em
                vários projetos.
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
            <Field label="Nome" error={errors.name?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register("name")}
                  placeholder="TOTVS Protheus"
                />
              )}
            </Field>

            <Field label="Categoria" error={errors.category?.message}>
              {(props) => (
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      {...props}
                      value={field.value}
                      onValueChange={field.onChange}
                      options={categoryOptions}
                    />
                  )}
                />
              )}
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar ferramenta</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Create the panel**

`src/components/settings/custom-tools-panel.tsx`:

```tsx
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { TOOL_CATEGORY_LABEL } from "@/data/tool-catalog"
import type { CustomTool } from "@/data/custom-tools"
import { useRegistry } from "@/lib/registry-store"
import { CreateCustomToolDialog } from "./create-custom-tool-dialog"

export function CustomToolsPanel() {
  const { customTools, removeCustomTool } = useRegistry()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingTool, setDeletingTool] = useState<CustomTool | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const columns: Column<CustomTool>[] = [
    {
      key: "name",
      header: "Nome",
      sortValue: (tool) => tool.name,
      cell: (tool) => <span className="font-medium">{tool.name}</span>,
    },
    {
      key: "category",
      header: "Categoria",
      sortValue: (tool) => TOOL_CATEGORY_LABEL[tool.category],
      cell: (tool) => (
        <Badge variant="outline">{TOOL_CATEGORY_LABEL[tool.category]}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (tool) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Excluir ferramenta"
          onClick={() => {
            setDeletingTool(tool)
            setDeleteDialogOpen(true)
          }}
        >
          <Trash2 />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus />
          Nova ferramenta
        </Button>
      </div>

      <DataTable
        data={customTools}
        columns={columns}
        rowKey={(tool) => tool.id}
        initialSort={{ key: "name", direction: "asc" }}
        emptyMessage="Nenhuma ferramenta cadastrada."
      />

      <CreateCustomToolDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir ferramenta"
        description={
          <>
            Excluir{" "}
            <span className="font-medium text-primary">
              {deletingTool?.name}
            </span>
            ? Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!deletingTool) return
          try {
            removeCustomTool(deletingTool.id)
            toast.add({ title: "Ferramenta excluída", type: "success" })
          } catch {
            toast.add({ title: "Erro ao excluir ferramenta", type: "error" })
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no new errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/create-custom-tool-dialog.tsx src/components/settings/custom-tools-panel.tsx
git commit -m "feat: cadastro e listagem de ferramentas customizadas"
```

---

### Task 5: General registry tabs + `/settings` route

**Files:**
- Create: `src/components/settings/general-registry.tsx`
- Create: `src/routes/settings.tsx`

**Interfaces:**
- Consumes: `ContactsPanel` (Task 3), `CustomToolsPanel` (Task 4), `Tabs`/`TabsList`/`TabsTab`/`TabsPanel` (`components/ui/tabs.tsx`), `PageHeader` (`components/layout/page.tsx`).

- [ ] **Step 1: Create the inner tabs (Contatos / Ferramentas customizadas)**

`src/components/settings/general-registry.tsx`:

```tsx
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { ContactsPanel } from "./contacts-panel"
import { CustomToolsPanel } from "./custom-tools-panel"

export function GeneralRegistry() {
  return (
    <Tabs defaultValue="contacts">
      <TabsList>
        <TabsTab value="contacts">Contatos</TabsTab>
        <TabsTab value="custom-tools">Ferramentas customizadas</TabsTab>
      </TabsList>

      <TabsPanel value="contacts" className="mt-4">
        <ContactsPanel />
      </TabsPanel>
      <TabsPanel value="custom-tools" className="mt-4">
        <CustomToolsPanel />
      </TabsPanel>
    </Tabs>
  )
}
```

- [ ] **Step 2: Create the `/settings` route**

`src/routes/settings.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "@/components/layout/page"
import { GeneralRegistry } from "@/components/settings/general-registry"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Cadastros gerais e preferências da conta."
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="general-registry">
          <TabsList>
            <TabsTab value="general-registry">Cadastros gerais</TabsTab>
          </TabsList>

          <TabsPanel value="general-registry" className="mt-4">
            <GeneralRegistry />
          </TabsPanel>
        </Tabs>
      </div>
    </>
  )
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})
```

- [ ] **Step 3: Regenerate the route tree**

The route tree (`src/routeTree.gen.ts`) is auto-generated by the TanStack Router Vite plugin — it must pick up `/settings` before anything referencing it (including Task 2's sidebar link) will typecheck.

Run: `npx vite build`
Expected: build succeeds (or fails only on unrelated pre-existing issues) and `src/routeTree.gen.ts` now contains a `/settings` entry (`Route as SettingsRouteImport from './routes/settings'`).

- [ ] **Step 4: Full typecheck and build**

Run: `npm run build`
Expected: `tsc -b` passes with no errors — this is what confirms Task 2's `to: "/settings"` link now resolves — followed by a clean `vite build`.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/general-registry.tsx src/routes/settings.tsx
git commit -m "feat: rota /settings com aba Cadastros gerais"
```

---

## Self-Review

- **Spec coverage:** Contacts (name/email/phone/company, create+delete, dense table) ✓ Task 3. Custom tools (name/category from the 8 `TOOL_CATEGORY_ORDER` values, create+delete, dense table) ✓ Task 4. `RegistryProvider`/`useRegistry()` with the exact shape from the spec ✓ Task 1. Two `Tabs` (Base UI) ✓ Task 5. Sidebar entry ✓ Task 2. Explicitly deferred by this plan (matches the spec's own "Riscos" section): `Project.client` → `clientId` migration, `ToolSelect` merging custom tools, "+ Novo contato" shortcut inside the project form. Route is `/settings` (not `/cadastros`) and "Cadastros gerais" is a tab inside it, not its own sidebar item — this is the explicit change the user asked for on top of the spec.
- **Placeholder scan:** no TBD/"add validation"/"similar to Task N" — every step has real code.
- **Type consistency:** `Contact`/`CustomTool` fields match across `data/*.ts`, `registry-store.tsx`, the dialogs, and the panels. `useRegistry()`'s returned function names (`addContact`, `removeContact`, `addCustomTool`, `removeCustomTool`) match what Tasks 3–4 call.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-12-settings-cadastros-gerais.md`.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
