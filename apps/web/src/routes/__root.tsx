import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toast"
import { ProjectsProvider } from "@/lib/projects-store"
import { RegistryProvider } from "@/lib/registry-store"

export const Route = createRootRoute({
  component: () => (
    <RegistryProvider>
      <ProjectsProvider>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster />
      </ProjectsProvider>
    </RegistryProvider>
  ),
})
