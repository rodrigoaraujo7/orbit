import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Styled pieces of the Base UI Select, reused as-is by the grouped tool select
 * (`tool-select.tsx`) — this is what standardizes the dropdown look across the
 * whole platform. `Select` right below is the ready-made composition for simple
 * lists (most cases).
 */
export function SelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-[color,border-color,box-shadow] outline-none",
        "hover:bg-muted/50",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export function SelectPopup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Popup
      className={cn(
        "max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150",
        "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export function SelectItem({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export function SelectGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn(
        "px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

// Pieces with no styling of their own — they only group/position. Re-exported
// so anyone building a custom select (e.g. tool-select.tsx) does not import
// from the package directly, keeping a single coupling point with Base UI.
export const SelectRoot = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export const SelectIcon = SelectPrimitive.Icon
export const SelectPortal = SelectPrimitive.Portal
export const SelectPositioner = SelectPrimitive.Positioner
export const SelectGroup = SelectPrimitive.Group
export const SelectItemText = SelectPrimitive.ItemText
export const SelectItemIndicator = SelectPrimitive.ItemIndicator

export type SelectOption = { value: string; label: string; icon?: React.ReactNode }

/**
 * Ready-made select for simple "value + label" lists — status, billing cycle,
 * who pays, etc. Controlled (`value`/`onValueChange`), not `register()`: use it
 * with react-hook-form's `Controller`.
 */
export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Selecione",
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  return (
    <SelectRoot
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={describedBy}
      >
        <SelectValue className="min-w-0 flex-1 truncate text-left">
          {(selected: string | null) => {
            const option = options.find((o) => o.value === selected)
            return option ? (
              <span className="flex min-w-0 items-center gap-2">
                {option.icon}
                <span className="truncate">{option.label}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
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
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.icon}
                <SelectItemText>{option.label}</SelectItemText>
                <SelectItemIndicator className="ml-auto">
                  <Check className="size-3.5 text-primary" />
                </SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  )
}
