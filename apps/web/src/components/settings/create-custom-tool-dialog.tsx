import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-mobile"
import type { CustomTool } from "@/data/custom-tools"
import { TOOL_CATEGORY_ORDER, type ToolCategory } from "@/data/tool-catalog"
import { toolCategoryOptions } from "@/i18n/labels"
import { useRegistry } from "@/lib/registry-store"

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
  tool,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** present = editing this tool; absent = creating a new one */
  tool?: CustomTool
}) {
  useTranslation()
  const { addCustomTool, updateCustomTool } = useRegistry()
  const categoryOptions = toolCategoryOptions()
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

  // Keep title/CTA from the open snapshot — the popup still paints while closing.
  const [activeTool, setActiveTool] = useState<CustomTool | undefined>(tool)
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setActiveTool(tool)
      reset(
        tool
          ? { name: tool.name, category: tool.category }
          : emptyCustomToolForm,
      )
    }
    wasOpen.current = open
  }, [open, tool, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      category: values.category as ToolCategory,
    }
    try {
      if (activeTool) {
        await updateCustomTool(activeTool.id, payload)
        toast.add({ title: "Ferramenta atualizada", type: "success" })
      } else {
        await addCustomTool(payload)
        toast.add({ title: "Ferramenta criada", type: "success" })
      }
      onOpenChange(false)
    } catch {
      toast.add({
        title: activeTool ? "Erro ao atualizar ferramenta" : "Erro ao criar ferramenta",
        type: "error",
      })
    }
  })

  const isMobile = useIsMobile()

  const formFields = (
    <>
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
    </>
  )

  const cancelButton = (
    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
      Cancelar
    </Button>
  )
  const submitButton = (
    <Button type="submit">{activeTool ? "Salvar" : "Criar ferramenta"}</Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader>
              <DrawerTitle>{activeTool ? "Editar ferramenta" : "Nova ferramenta"}</DrawerTitle>
              <DrawerDescription>
                {activeTool
                  ? "Atualize os dados desta ferramenta."
                  : "Cadastre uma ferramenta fora do catálogo para reaproveitar em vários projetos."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {formFields}
            </div>
            <DrawerFooter className="flex-row [&>*]:flex-1">
              {cancelButton}
              {submitButton}
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>{activeTool ? "Editar ferramenta" : "Nova ferramenta"}</DialogTitle>
            <DialogDescription className="mt-0.5">
              {activeTool
                ? "Atualize os dados desta ferramenta."
                : "Cadastre uma ferramenta fora do catálogo para reaproveitar em vários projetos."}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
          >
            <X />
          </Button>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
          {formFields}
          <DialogFooter className="mt-2">
            {cancelButton}
            {submitButton}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
