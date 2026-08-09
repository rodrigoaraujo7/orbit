import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { ProjectsProvider } from "@/lib/projects-store"

export const Route = createRootRoute({
  component: () => (
    <ProjectsProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProjectsProvider>
  ),
})
