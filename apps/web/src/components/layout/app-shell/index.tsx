import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Menu, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

const COLLAPSED_KEY = "pm-sidebar-collapsed";

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        P
      </div>
      <span className={cn("truncate text-sm font-semibold tracking-tight", collapsed && "sr-only")}>
        {t("layout.brand")}
      </span>
    </div>
  );
}

function CollapseButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  // waits for the sidebar to finish expanding (the <aside> duration-400) before showing up
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={t("layout.collapseMenu")}
      className={cn(
        "group absolute top-1/2 right-1.5 z-10 h-[65px] w-[8px] -translate-y-1/2 rounded-full bg-border p-0",
        "transition-[height,background-color,opacity] duration-200 ease-out",
        "hover:h-[100px] hover:bg-white/20 active:!translate-y-[-50%]",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <ChevronLeft className="pointer-events-none absolute top-1/2 right-full mr-1.5 size-5 translate-x-3 -translate-y-1/2 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-[250ms]" />
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-400 ease-[cubic-bezier(0.34,1.65,0.64,1)] md:flex",
          "[&>*:not(button)]:transition-[filter] [&>*:not(button)]:duration-300 [&>*:not(button)]:ease-out [&>*:not(button)]:delay-[250ms]",
          !collapsed && "has-[>button:hover]:[&>*:not(button)]:blur-sm",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <Logo collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        {collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(false)}
            aria-label={t("layout.expandMenu")}
            className="mx-auto mb-2 animate-in fade-in zoom-in-75 duration-300 ease-out"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
        <div className="border-t p-2">
          <UserMenu collapsed={collapsed} />
        </div>

        {!collapsed && <CollapseButton onClick={() => setCollapsed(true)} />}
      </aside>

      {/* Mobile topbar + nav drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="left">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/80 px-3 backdrop-blur-sm md:hidden">
          <DrawerTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("layout.openMenu")} />}>
            <Menu />
          </DrawerTrigger>
        </header>

        <DrawerContent className="w-60 bg-sidebar/40 text-sidebar-foreground after:hidden">
          <DrawerTitle className="sr-only">{t("layout.mainNav")}</DrawerTitle>
          <Logo />
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          <div className="border-t p-2">
            <UserMenu />
          </div>
        </DrawerContent>
      </Drawer>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
