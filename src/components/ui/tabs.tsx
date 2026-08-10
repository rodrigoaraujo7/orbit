import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-1 rounded-xl bg-muted p-1", className)}
      {...props}
    />
  )
}

export function TabsTab({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors select-none [&_svg]:size-4",
        "hover:text-foreground",
        "data-active:bg-background data-active:text-foreground data-active:shadow-sm",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  )
}

export function TabsPanel({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return <TabsPrimitive.Panel className={cn("outline-none", className)} {...props} />
}
