import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
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
import { toast } from "@/components/ui/toast"
import type { Contact } from "@/data/contacts"
import { useIsMobile } from "@/hooks/use-mobile"
import i18n from "@/i18n"
import { maskBrPhone } from "@/lib/format"
import { useRegistry } from "@/lib/registry-store"

function contactSchema() {
  return z
    .object({
      name: z.string().trim().min(2, i18n.t("validation.minChars")),
      email: z.string().trim(),
      phone: z.string().trim().min(1, i18n.t("validation.enterPhone")),
      company: z.string().trim().min(1, i18n.t("validation.enterCompany")),
    })
    .superRefine((values, ctx) => {
      if (values.email && !z.string().email().safeParse(values.email).success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: i18n.t("validation.emailInvalid"),
        })
      }
    })
}

type ContactFormValues = z.infer<ReturnType<typeof contactSchema>>

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
  const { t } = useTranslation()
  const { addContact, updateContact } = useRegistry()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: (values, context, options) =>
      zodResolver(contactSchema())(values, context, options),
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
        toast.add({ title: t("settings.contactUpdated"), type: "success" })
      } else {
        await addContact(payload)
        toast.add({ title: t("settings.contactCreated"), type: "success" })
      }
      onOpenChange(false)
    } catch {
      toast.add({
        title: activeContact ? t("settings.contactUpdateError") : t("settings.contactCreateError"),
        type: "error",
      })
    }
  })

  const isMobile = useIsMobile()

  const formFields = (
    <>
      <Field label={t("common.name")} error={errors.name?.message}>
        {(props) => (
          <Input
            {...props}
            {...register("name")}
            placeholder={t("projects.namePlaceholder")}
          />
        )}
      </Field>

      <Field label={t("common.email")} error={errors.email?.message} hint={t("common.optional")}>
        {(props) => (
          <Input
            {...props}
            {...register("email")}
            type="email"
            placeholder={t("projects.emailPlaceholder")}
          />
        )}
      </Field>

      <Field label={t("common.phone")} error={errors.phone?.message}>
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
            placeholder={t("projects.phonePlaceholder")}
          />
        )}
      </Field>

      <Field label={t("common.company")} error={errors.company?.message}>
        {(props) => (
          <Input
            {...props}
            {...register("company")}
            placeholder={t("projects.companyPlaceholder")}
          />
        )}
      </Field>
    </>
  )

  const cancelButton = (
    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
      {t("common.cancel")}
    </Button>
  )
  const submitButton = (
    <Button type="submit">{activeContact ? t("common.save") : t("settings.createContact")}</Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader>
              <DrawerTitle>{activeContact ? t("settings.editContact") : t("settings.newContact")}</DrawerTitle>
              <DrawerDescription>
                {activeContact
                  ? t("settings.editContactDescription")
                  : t("settings.newContactDescription")}
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
            <DialogTitle>{activeContact ? t("settings.editContact") : t("settings.newContact")}</DialogTitle>
            <DialogDescription className="mt-0.5">
              {activeContact
                ? t("settings.editContactDescription")
                : t("settings.newContactDescription")}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label={t("common.close")}
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
