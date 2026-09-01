import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
} from '@/components/ui/select'
import {
  OTHER_TOOL_ID,
  TOOL_CATEGORY_ORDER,
  findCatalogTool,
  toolsByCategory,
} from '@/data/tool-catalog'
import { toolCategoryLabel } from '@/i18n/labels'
import { ToolIcon } from '../tool-icons'

/**
 * Select grouped by category with a per-tool icon — the same styled pieces from
 * `ui/select.tsx`, just composed by hand instead of the generic `Select`,
 * because it needs groups and icons (which a native `<option>` cannot render
 * and the simple `Select` does not cover).
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
  const { t } = useTranslation()

  return (
    <SelectRoot value={value || null} onValueChange={(next) => onValueChange(next as string)}>
      <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={describedBy}>
        <SelectValue className="min-w-0 flex-1 text-left">
          {(selected: string | null) => {
            if (!selected) {
              return <span className="text-muted-foreground">{t('projects.selectTool')}</span>
            }
            return (
              <span className="flex min-w-0 items-center gap-2 truncate">
                <ToolIcon id={selected} className="size-4 shrink-0" />
                <span className="truncate">
                  {selected === OTHER_TOOL_ID
                    ? t('category.other')
                    : (findCatalogTool(selected)?.name ?? selected)}
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
                <SelectGroupLabel>{toolCategoryLabel(category)}</SelectGroupLabel>
                {toolsByCategory(category).map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    <ToolIcon id={tool.id} className="size-4 shrink-0" />
                    <SelectItemText>
                      {tool.id === OTHER_TOOL_ID ? t('category.other') : tool.name}
                    </SelectItemText>
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
