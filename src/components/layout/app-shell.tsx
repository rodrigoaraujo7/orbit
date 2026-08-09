import { useEffect, useState, type ReactNode } from "react"
import { Drawer } from "@base-ui/react/drawer"
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import { SidebarNav } from "./sidebar-nav"
import { UserMenu } from "./user-menu"

const COLLAPSED_KEY = "pm-sidebar-collapsed"

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        P
      </div>
      <span
        className={cn(
          "truncate text-sm font-semibold tracking-tight",
          collapsed && "sr-only"
        )}
      >
        Projects
      </span>
    </div>
  )
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark"
  onToggle: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "1"
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0")
  }, [collapsed])

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <Logo collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <div className="border-t p-2">
          <UserMenu collapsed={collapsed} theme={theme} onToggleTheme={toggle} />
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute top-1/2 -right-3 z-10 size-7 !translate-y-[-50%] rounded-full !bg-background p-0 shadow-sm active:!translate-y-[-50%]"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-3 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </Button>
          <Logo />
        </div>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      {/* Drawer mobile — swipe pra esquerda fecha */}
      <Drawer.Root
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        swipeDirection="left"
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Drawer.Popup className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 ease-out data-ending-style:-translate-x-full data-starting-style:-translate-x-full">
            <Drawer.Title className="sr-only">Navegação principal</Drawer.Title>
            <Logo />
            <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}
