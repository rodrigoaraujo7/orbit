import type { LucideIcon } from "lucide-react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={className} {...props} />
}

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-6 border-b border-border", className)}
      {...props}
    />
  )
}

export function TabsTab({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "cursor-pointer border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-muted-foreground outline-none transition-colors select-none",
        "hover:text-foreground",
        "data-active:border-primary data-active:text-primary",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  )
}

/** Line tabs on desktop, floating icon dock on mobile — one tab set, two skins. */
export function TabsDock({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/50 bg-background/40 p-1.5 shadow-lg backdrop-blur-xl backdrop-saturate-150",
        "md:static md:inline-flex md:translate-x-0 md:gap-6 md:rounded-none md:border-0 md:border-b md:border-border md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none md:backdrop-saturate-100",
        className,
      )}
      {...props}
    />
  )
}

export function TabsDockTab({
  icon: Icon,
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab> & { icon: LucideIcon }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "cursor-pointer text-muted-foreground outline-none transition-[color,background-color,box-shadow] select-none",
        "grid size-11 place-items-center rounded-full bg-background/40 backdrop-blur-xl backdrop-saturate-150 [&_svg]:size-5",
        "data-active:bg-primary data-active:text-primary-foreground data-active:backdrop-blur-none data-active:shadow-[0_0_18px_6px_color-mix(in_oklch,var(--primary)_50%,transparent)]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "md:flex md:size-auto md:rounded-none md:border-b-2 md:border-transparent md:bg-transparent md:px-1 md:pb-2 md:text-sm md:font-medium md:backdrop-blur-none md:backdrop-saturate-100 md:[&_svg]:hidden",
        "md:hover:text-foreground md:data-active:border-primary md:data-active:bg-transparent md:data-active:text-primary md:data-active:shadow-none",
        className,
      )}
      {...props}
    >
      <Icon />
      <span className="max-md:sr-only">{children}</span>
    </TabsPrimitive.Tab>
  )
}

export function TabsPanel({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return <TabsPrimitive.Panel className={cn("outline-none", className)} {...props} />
}
