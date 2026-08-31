import { Menu } from "@base-ui/react/menu"
import { Check, Languages, LogOut, Pencil, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getLocale, setLocale, type Locale } from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation()
  const locale = getLocale()
  const { data } = authClient.useSession()
  const user = {
    name: data?.user.name ?? t("common.accountFallback"),
    email: data?.user.email ?? "",
  }

  function chooseLocale(next: Locale) {
    setLocale(next)
  }

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
            {initials(user.name)}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </p>
          </div>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={10} className="z-[60] w-[var(--anchor-width)] min-w-56">
          <Menu.Popup className="w-full rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.Item className={itemClass}>
              <Pencil className="size-3.5" />
              {t("layout.editProfile")}
            </Menu.Item>
            <Menu.Item className={itemClass}>
              <Users className="size-3.5" />
              {t("layout.switchAccount")}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <p className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Languages className="size-3.5" />
              {t("common.language")}
            </p>
            <Menu.Item className={itemClass} onClick={() => chooseLocale("en-US")}>
              <span className="flex-1">{t("common.english")}</span>
              {locale === "en-US" && <Check className="size-3.5 text-primary" />}
            </Menu.Item>
            <Menu.Item className={itemClass} onClick={() => chooseLocale("pt-BR")}>
              <span className="flex-1">{t("common.portuguese")}</span>
              {locale === "pt-BR" && <Check className="size-3.5 text-primary" />}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              onClick={() => void authClient.signOut()}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive outline-none select-none",
                "data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
              )}
            >
              <LogOut className="size-3.5" />
              {t("layout.signOut")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
