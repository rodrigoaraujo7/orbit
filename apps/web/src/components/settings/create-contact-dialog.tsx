import { Dialog } from "@base-ui/react/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { toast } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegistry } from "@/lib/registry-store"

const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Informe pelo menos 2 caracteres"),
    email: z.string().trim(),
    phone: z.string().trim().min(1, "Informe o telefone"),
    company: z.string().trim().min(1, "Informe a empresa"),
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await addContact({
        name: values.name,
        email: values.email || undefined,
        phone: values.phone,
        company: values.company,
      })
      toast.add({ title: "Contato criado", type: "success" })
      onOpenChange(false)
    } catch {
      toast.add({ title: "Erro ao criar contato", type: "error" })
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

      <Field label="Telefone" error={errors.phone?.message}>
        {(props) => (
          <Input
            {...props}
            {...register("phone")}
            placeholder="(11) 98765-4321"
          />
        )}
      </Field>

      <Field label="Empresa" error={errors.company?.message}>
        {(props) => (
          <Input
            {...props}
            {...register("company")}
            placeholder="Empresa Ltda"
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
  const submitButton = <Button type="submit">Criar contato</Button>

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader>
              <DrawerTitle>Novo contato</DrawerTitle>
              <DrawerDescription>
                Cadastre um contato para reaproveitar em vários projetos.
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
              <DialogTitle>Novo contato</DialogTitle>
              <DialogDescription className="mt-0.5">
                Cadastre um contato para reaproveitar em vários projetos.
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
