import { zodResolver } from "@hookform/resolvers/zod"
import { useLayoutEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { toast } from "@/components/ui/toast"
import type { Contact } from "@/data/contacts"
import { maskBrPhone } from "@/lib/format"
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

function fromContact(contact: Contact): ContactFormValues {
  return {
    name: contact.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
  }
}

export function CreateContactDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** present = editing this contact; absent = creating a new one */
  contact?: Contact
}) {
  const { addContact, updateContact } = useRegistry()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyContactForm,
  })

  // Keep title/CTA from the open snapshot — the popup still paints while closing.
  const [activeContact, setActiveContact] = useState<Contact | undefined>(contact)
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setActiveContact(contact)
      reset(contact ? fromContact(contact) : emptyContactForm)
    }
    wasOpen.current = open
  }, [open, contact, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone,
      company: values.company,
    }
    try {
      if (activeContact) {
        await updateContact(activeContact.id, payload)
        toast.add({ title: "Contato atualizado", type: "success" })
      } else {
        await addContact(payload)
        toast.add({ title: "Contato criado", type: "success" })
      }
      onOpenChange(false)
    } catch {
      toast.add({
        title: activeContact ? "Erro ao atualizar contato" : "Erro ao criar contato",
        type: "error",
      })
    }
  })

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
            {...register("phone", {
              onChange: (event) => {
                event.target.value = maskBrPhone(event.target.value)
              },
            })}
            inputMode="tel"
            autoComplete="tel"
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

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <div>
            <ResponsiveDialogTitle>
              {activeContact ? "Editar contato" : "Novo contato"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {activeContact
                ? "Atualize os dados deste contato."
                : "Cadastre um contato para reaproveitar em vários projetos."}
            </ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="flex flex-col gap-4">
            {formFields}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{activeContact ? "Salvar" : "Criar contato"}</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
