import { Dialog } from "@base-ui/react/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
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
import {
  TOOL_CATEGORY_LABEL,
  TOOL_CATEGORY_ORDER,
  type ToolCategory,
} from "@/data/tool-catalog"
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await addCustomTool({
        name: values.name,
        category: values.category as ToolCategory,
      })
      toast.add({ title: "Ferramenta criada", type: "success" })
      onOpenChange(false)
    } catch {
      toast.add({ title: "Erro ao criar ferramenta", type: "error" })
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
  const submitButton = <Button type="submit">Criar ferramenta</Button>

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader>
              <DrawerTitle>Nova ferramenta</DrawerTitle>
              <DrawerDescription>
                Cadastre uma ferramenta fora do catálogo para reaproveitar em
                vários projetos.
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <DialogTitle>Nova ferramenta</DialogTitle>
              <DialogDescription className="mt-0.5">
                Cadastre uma ferramenta fora do catálogo para reaproveitar em
                vários projetos.
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
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
            {formFields}
            <div className="mt-2 flex justify-end gap-2">
              {cancelButton}
              {submitButton}
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
