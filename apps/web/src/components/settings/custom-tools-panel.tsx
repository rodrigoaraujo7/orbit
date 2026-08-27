import { Plus } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Emphasis } from "@/components/ui/emphasis"
import { DataTable, type Column } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"
import { TOOL_CATEGORY_LABEL } from "@/data/tool-catalog"
import type { CustomTool } from "@/data/custom-tools"
import { useRegistry } from "@/lib/registry-store"
import { CreateCustomToolDialog } from "./create-custom-tool-dialog"

export function CustomToolsPanel() {
  const { customTools, removeCustomTool } = useRegistry()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null)
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

      <CreateCustomToolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tool={editingTool ?? undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir ferramenta"
        description={
          <>
            Excluir{" "}
            <Emphasis className="text-primary">{deletingTool?.name}</Emphasis>
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
