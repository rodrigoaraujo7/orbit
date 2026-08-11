import { Menu } from "@base-ui/react/menu"
import { LogOut, Moon, Pencil, Sun, Users } from "lucide-react"

import { cn } from "@/lib/utils"

// ponytail: mocked data and actions — no auth/backend yet. Plug in the real
// user and handlers (logout, switch account, edit profile) once they exist.
const mockUser = {
  name: "Rodrigo Araujo",
  email: "rodrigo@fastbuilt.com.br",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UserMenu({
  collapsed = false,
  theme,
  onToggleTheme,
}: {
  collapsed?: boolean
  theme: "light" | "dark"
  onToggleTheme: () => void
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left outline-none transition-colors",
          "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials(mockUser.name)}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {mockUser.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {mockUser.email}
            </p>
          </div>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={10} className="z-[60]">
          <Menu.Popup className="min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">
              <Pencil className="size-3.5" />
              Editar perfil
            </Menu.Item>
            <Menu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">
              <Users className="size-3.5" />
              Trocar de conta
            </Menu.Item>
            <Menu.Item
              onClick={onToggleTheme}
              closeOnClick={false}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              {theme === "dark" ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive outline-none select-none",
                "data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
              )}
            >
              <LogOut className="size-3.5" />
              Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
