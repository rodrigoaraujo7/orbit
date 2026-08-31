import { Plus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Emphasis } from "@/components/ui/emphasis"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"
import type { CustomTool } from "@/data/custom-tools"
import { toolCategoryLabel } from "@/i18n/labels"
import { useRegistry } from "@/lib/registry-store"
import { CreateCustomToolDialog } from "./create-custom-tool-dialog"

export function CustomToolsPanel() {
  const { t } = useTranslation()
  const { customTools, removeCustomTool } = useRegistry()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null)
  const [deletingTool, setDeletingTool] = useState<CustomTool | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const columns: Column<CustomTool>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortValue: (tool) => tool.name,
      cell: (tool) => <span className="font-medium">{tool.name}</span>,
    },
    {
      key: "category",
      header: t("common.category"),
      sortValue: (tool) => toolCategoryLabel(tool.category),
      cell: (tool) => (
        <Badge variant="outline">{toolCategoryLabel(tool.category)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (tool) => (
        <RowActionsMenu
          onEdit={() => {
            setEditingTool(tool)
            setDialogOpen(true)
          }}
          onDelete={() => {
            setDeletingTool(tool)
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
            setEditingTool(null)
            setDialogOpen(true)
          }}
        >
          <Plus />
          {t("settings.newTool")}
        </Button>
      </div>

      <DataTable
        data={customTools}
        columns={columns}
        rowKey={(tool) => tool.id}
        initialSort={{ key: "name", direction: "asc" }}
        emptyMessage={t("settings.noTools")}
      />

      <CreateCustomToolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tool={editingTool ?? undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("settings.deleteTool")}
        description={
          <>
            {t("common.delete")}{" "}
            <Emphasis className="text-primary">{deletingTool?.name}</Emphasis>
            ? {t("common.cannotUndo")}
          </>
        }
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          /* v8 ignore next -- confirm is only enabled after a row is chosen */
          if (!deletingTool) return
          try {
            removeCustomTool(deletingTool.id)
            toast.add({ title: t("settings.toolDeleted"), type: "success" })
          } catch {
            toast.add({ title: t("settings.toolDeleteError"), type: "error" })
          }
        }}
      />
    </div>
  )
}
