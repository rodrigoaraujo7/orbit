import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils'

/**
 * The platform's default tooltip — used today on the sidebar items when it is
 * collapsed (icon only, no visible label).
 */
export function Tooltip({
  label,
  children,
  side = 'right',
}: {
  label: string
  children: React.ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={200} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8}>
          <TooltipPrimitive.Popup
            className={cn(
              'z-[70] rounded-lg bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-lg',
              'origin-[var(--transform-origin)] transition-[transform,opacity] duration-150',
              'data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export const TooltipProvider = TooltipPrimitive.Provider
