import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { ProjectsProvider } from "@/lib/projects-store"
import { RegistryProvider } from "@/lib/registry-store"

const queryClient = new QueryClient()

function Gate() {
  const { data, isPending } = authClient.useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isPending) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Carregando…</div>
  }
  if (!data && pathname !== "/login") return <Navigate to="/login" />
  if (data && pathname === "/login") return <Navigate to="/" />
  if (pathname === "/login") return <Outlet />

  return (
    <QueryClientProvider client={queryClient}>
      <RegistryProvider>
        <ProjectsProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster />
        </ProjectsProvider>
      </RegistryProvider>
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: Gate,
})
