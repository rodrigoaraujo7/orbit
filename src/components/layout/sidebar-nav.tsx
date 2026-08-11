import { Link } from "@tanstack/react-router"
import { Columns3, FolderGit2, LayoutDashboard, Wallet } from "lucide-react"

import { Tooltip, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projetos", icon: FolderGit2 },
  { to: "/kanban", label: "Kanban", icon: Columns3 },
  { to: "/finance", label: "Financeiro", icon: Wallet },
] as const

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <TooltipProvider>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const link = (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/65 outline-none transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                "data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              {/* active item marker */}
              <span
                aria-hidden
                className="absolute -left-2 h-4 w-0.5 rounded-r-full bg-sidebar-primary opacity-0 transition-opacity duration-200 group-data-[status=active]:opacity-100"
              />
              <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
            </Link>
          )

          return collapsed ? (
            <Tooltip key={to} label={label}>
              {link}
            </Tooltip>
          ) : (
            link
          )
        })}
      </nav>
    </TooltipProvider>
  )
}
