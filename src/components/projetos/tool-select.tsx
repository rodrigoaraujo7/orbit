import { Check, ChevronDown } from "lucide-react"

import {
  SelectGroup,
  SelectGroupLabel,
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
import {
  TOOL_CATEGORY_LABEL,
  TOOL_CATEGORY_ORDER,
  findCatalogTool,
  toolsByCategory,
} from "@/data/tool-catalog"
import { ToolIcon } from "./tool-icons"

/**
 * Select agrupado por categoria com ícone por ferramenta — mesmas peças
 * estilizadas de `ui/select.tsx`, só que composto na mão em vez do `Select`
 * genérico, porque precisa de grupos e ícone (que `<option>` nativo não
 * renderiza e o `Select` simples não cobre).
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
    <SelectRoot
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={describedBy}>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) => {
            if (!selected) {
              return (
                <span className="text-muted-foreground">
                  Selecione a ferramenta
                </span>
              )
            }
            return (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <ToolIcon id={selected} className="size-4 shrink-0" />
                <span className="truncate">
                  {findCatalogTool(selected)?.name ?? selected}
                </span>
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
            {TOOL_CATEGORY_ORDER.map((category) => (
              <SelectGroup key={category}>
                <SelectGroupLabel>
                  {TOOL_CATEGORY_LABEL[category]}
                </SelectGroupLabel>
                {toolsByCategory(category).map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    <ToolIcon id={tool.id} className="size-4 shrink-0" />
                    <SelectItemText>{tool.name}</SelectItemText>
                    <SelectItemIndicator className="ml-auto">
                      <Check className="size-3.5 text-primary" />
                    </SelectItemIndicator>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  )
}
