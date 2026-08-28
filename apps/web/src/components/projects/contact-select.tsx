import { Check, ChevronDown, User } from "lucide-react"
import { useTranslation } from "react-i18next"

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

function contactSubtitle(contact: Contact) {
  return [contact.email, contact.phone, contact.company].filter(Boolean).join(" · ")
}

/**
 * Contact select for the project form — same styled pieces as `ToolSelect`,
 * composed by hand because each option needs two lines (name + details), not
 * just a label. Creating a contact inline is the create-project-dialog's
 * "create new contact" checkbox, not this component's job.
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
  const { t } = useTranslation()
  const { contacts, findContact } = useRegistry()
  const sortedContacts = [...contacts].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <SelectRoot value={value || null} onValueChange={(next) => onValueChange(next ?? "")}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={describedBy}>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) => {
            const contact = selected ? findContact(selected) : undefined
            if (!contact) {
              return <span className="text-muted-foreground">{t("projects.selectContact")}</span>
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
            {sortedContacts.map((contact) => {
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
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  )
}
