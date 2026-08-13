import { Check, ChevronDown, Plus, User } from "lucide-react"
import { useState } from "react"

import { CreateContactDialog } from "@/components/settings/create-contact-dialog"
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Contact } from "@/data/contacts"
import { useRegistry } from "@/lib/registry-store"

/** Sentinel option id — intercepted in onValueChange, never a real contact id. */
const NEW_CONTACT_VALUE = "__new_contact__"

function contactSubtitle(contact: Contact) {
  return [contact.email, contact.phone, contact.company].filter(Boolean).join(" · ")
}

/**
 * Contact select for the project form — same styled pieces as `ToolSelect`,
 * composed by hand because each option needs two lines (name + details), not
 * just a label. Ends with a "+ Novo contato" option that opens a stacked
 * `CreateContactDialog`; the contact it creates is selected automatically,
 * without closing the project form underneath.
 */
export function ContactSelect({
  id,
  value,
  onValueChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const { contacts } = useRegistry()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <SelectRoot
        value={value || null}
        onValueChange={(next) => {
          if (next === NEW_CONTACT_VALUE) {
            setCreateOpen(true)
            return
          }
          onValueChange(next ?? "")
        }}
      >
        <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={describedBy}>
          <SelectValue className="min-w-0 flex-1 text-left">
            {(selected: string | null) => {
              const contact = contacts.find((c) => c.id === selected)
              if (!contact) {
                return <span className="text-muted-foreground">Selecione o contato</span>
              }
              return (
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{contact.name}</span>
                </span>
              )
            }}
          </SelectValue>
          <SelectIcon>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </SelectIcon>
        </SelectTrigger>

        <SelectPortal>
          <SelectPositioner
            sideOffset={4}
            alignItemWithTrigger={false}
            className="z-[60] w-[var(--anchor-width)]"
          >
            <SelectPopup>
              {contacts.map((contact) => {
                const subtitle = contactSubtitle(contact)
                return (
                  <SelectItem
                    key={contact.id}
                    value={contact.id}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="flex w-full items-center gap-2">
                      <SelectItemText>{contact.name}</SelectItemText>
                      <SelectItemIndicator className="ml-auto">
                        <Check className="size-3.5 text-primary" />
                      </SelectItemIndicator>
                    </span>
                    {subtitle && (
                      <span className="text-xs text-muted-foreground">{subtitle}</span>
                    )}
                  </SelectItem>
                )
              })}

              <SelectItem
                value={NEW_CONTACT_VALUE}
                className="mt-1 border-t border-border pt-2 text-primary"
              >
                <Plus className="size-4 shrink-0" />
                <SelectItemText>Novo contato</SelectItemText>
              </SelectItem>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </SelectRoot>

      <CreateContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(contact) => onValueChange(contact.id)}
      />
    </>
  )
}
