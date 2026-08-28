import { Plus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Emphasis } from "@/components/ui/emphasis"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"
import type { Contact } from "@/data/contacts"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { CreateContactDialog } from "./create-contact-dialog"

export function ContactsPanel() {
  const { t } = useTranslation()
  const { contacts, removeContact } = useRegistry()
  const { projects } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortValue: (contact) => contact.name,
      cell: (contact) => <span className="font-medium">{contact.name}</span>,
    },
    {
      key: "email",
      header: t("common.email"),
      className: "hidden sm:table-cell",
      cell: (contact) =>
        contact.email ?? <span className="text-muted-foreground">{t("common.emDash")}</span>,
    },
    {
      key: "phone",
      header: t("common.phone"),
      className: "hidden md:table-cell",
      cell: (contact) =>
        contact.phone ?? <span className="text-muted-foreground">{t("common.emDash")}</span>,
    },
    {
      key: "company",
      header: t("common.company"),
      className: "hidden lg:table-cell",
      cell: (contact) =>
        contact.company ?? <span className="text-muted-foreground">{t("common.emDash")}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (contact) => (
        <RowActionsMenu
          onEdit={() => {
            setEditingContact(contact)
            setDialogOpen(true)
          }}
          onDelete={() => {
            setDeletingContact(contact)
            setDeleteDialogOpen(true)
          }}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingContact(null)
            setDialogOpen(true)
          }}
        >
          <Plus />
          {t("settings.newContact")}
        </Button>
      </div>

      <DataTable
        data={contacts}
        columns={columns}
        rowKey={(contact) => contact.id}
        initialSort={{ key: "name", direction: "asc" }}
        emptyMessage={t("settings.noContacts")}
      />

      <CreateContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact ?? undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("settings.deleteContact")}
        description={
          <>
            {t("common.delete")}{" "}
            <Emphasis className="text-primary">{deletingContact?.name}</Emphasis>
            ? {t("common.cannotUndo")}
          </>
        }
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (!deletingContact) return
          if (projects.some((p) => p.clientId === deletingContact.id)) {
            toast.add({
              title: t("settings.contactInUse"),
              description: t("settings.contactInUseDescription"),
              type: "error",
            })
            return
          }
          try {
            removeContact(deletingContact.id)
            toast.add({ title: t("settings.contactDeleted"), type: "success" })
          } catch {
            toast.add({ title: t("settings.contactDeleteError"), type: "error" })
          }
        }}
      />
    </div>
  )
}
