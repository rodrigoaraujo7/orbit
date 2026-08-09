import { Select } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"

import {
  TOOL_CATEGORY_LABEL,
  TOOL_CATEGORY_ORDER,
  findCatalogTool,
  toolsByCategory,
} from "@/data/tool-catalog"
import { cn } from "@/lib/utils"
import { ToolIcon } from "./tool-icons"

/**
 * Select agrupado por categoria com ícone por ferramenta. Precisa ser o Select
 * do Base UI porque `<option>` nativo não renderiza ícone.
 */
export function ToolSelect({
  id,
  value,
  onValueChange,
  invalid,
  describedBy,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <Select.Root
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <Select.Trigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-[color,border-color,box-shadow] outline-none",
          "hover:bg-muted/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        )}
      >
        <Select.Value>
          {(selected: string | null) => {
            if (!selected) {
              return (
                <span className="text-muted-foreground">
                  Selecione a ferramenta
                </span>
              )
            }
            return (
              <span className="flex items-center gap-2 truncate">
                <ToolIcon id={selected} className="size-4 shrink-0" />
                {findCatalogTool(selected)?.name ?? selected}
              </span>
            )
          }}
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-[60] w-[var(--anchor-width)]"
        >
          <Select.Popup className="max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {TOOL_CATEGORY_ORDER.map((category) => (
              <Select.Group key={category}>
                <Select.GroupLabel className="px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {TOOL_CATEGORY_LABEL[category]}
                </Select.GroupLabel>
                {toolsByCategory(category).map((tool) => {
                  return (
                    <Select.Item
                      key={tool.id}
                      value={tool.id}
                      className="flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      <ToolIcon id={tool.id} className="size-4 shrink-0" />
                      <Select.ItemText>{tool.name}</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5 text-primary" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  )
                })}
              </Select.Group>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
