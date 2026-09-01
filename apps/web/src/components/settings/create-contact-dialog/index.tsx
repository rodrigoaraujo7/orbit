import { zodResolver } from '@hookform/resolvers/zod'
import { useLayoutEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { toast } from '@/components/ui/toast'
import type { Contact } from '@/data/contacts'
import i18n from '@/i18n'
import { maskBrPhone } from '@/lib/format'
import { useRegistry } from '@/lib/registry-store'

function contactSchema() {
  return z
    .object({
      name: z.string().trim().min(2, i18n.t('validation.minChars')),
      email: z.string().trim(),
      phone: z.string().trim().min(1, i18n.t('validation.enterPhone')),
      company: z.string().trim().min(1, i18n.t('validation.enterCompany')),
    })
    .superRefine((values, ctx) => {
      if (values.email && !z.string().email().safeParse(values.email).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['email'],
          message: i18n.t('validation.emailInvalid'),
        })
      }
    })
}

type ContactFormValues = z.infer<ReturnType<typeof contactSchema>>

const emptyContactForm: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  company: '',
}

function fromContact(contact: Contact): ContactFormValues {
  return {
    name: contact.name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
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
    resolver: (values, ctx, opts) => zodResolver(contactSchema())(values, ctx, opts),
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
        toast.add({ title: t('settings.contactUpdated'), type: 'success' })
      } else {
        await addContact(payload)
        toast.add({ title: t('settings.contactCreated'), type: 'success' })
      }
      onOpenChange(false)
    } catch {
      toast.add({
        title: activeContact ? t('settings.contactUpdateError') : t('settings.contactCreateError'),
        type: 'error',
      })
    }
  })

  const formFields = (
    <>
      <Field label={t('common.name')} error={errors.name?.message}>
        {(props) => (
          <Input {...props} {...register('name')} placeholder={t('projects.namePlaceholder')} />
        )}
      </Field>

      <Field label={t('common.email')} error={errors.email?.message} hint={t('common.optional')}>
        {(props) => (
          <Input
            {...props}
            {...register('email')}
            type="email"
            placeholder={t('projects.emailPlaceholder')}
          />
        )}
      </Field>

      <Field label={t('common.phone')} error={errors.phone?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('phone', {
              onChange: (event) => {
                event.target.value = maskBrPhone(event.target.value)
              },
            })}
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('projects.phonePlaceholder')}
          />
        )}
      </Field>

      <Field label={t('common.company')} error={errors.company?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('company')}
            placeholder={t('projects.companyPlaceholder')}
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
              {activeContact ? t('settings.editContact') : t('settings.newContact')}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {activeContact
                ? t('settings.editContactDescription')
                : t('settings.newContactDescription')}
            </ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="flex flex-col gap-4">{formFields}</ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {activeContact ? t('common.save') : t('settings.createContact')}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
