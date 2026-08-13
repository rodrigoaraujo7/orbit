import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import type { Contact } from "@/data/contacts"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { CreateContactDialog } from "./create-contact-dialog"

export function ContactsPanel() {
  const { contacts, removeContact } = useRegistry()
  const { projects } = useProjects()
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
          if (projects.some((p) => p.clientId === deletingContact.id)) {
            toast.add({
              title: "Contato em uso",
              description: "Este contato está vinculado a um projeto e não pode ser excluído.",
              type: "error",
            })
            return
          }
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
