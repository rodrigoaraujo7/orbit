import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { ProjectsProvider, useProjects } from "@/lib/projects-store"
import { RegistryProvider, useRegistry } from "@/lib/registry-store"

const queryClient = new QueryClient()

function LoadingScreen({ message = "Carregando…" }: { message?: string }) {
  return (
    <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">{message}</div>
  )
}

function WorkspaceGate({ children }: { children: ReactNode }) {
  const { isPending: projectsPending, isError: projectsError } = useProjects()
  const { isPending: registryPending, isError: registryError } = useRegistry()
  if (projectsPending || registryPending) return <LoadingScreen />
  if (projectsError || registryError) {
    return <LoadingScreen message="Não foi possível carregar os dados." />
  }
  return children
}

function Gate() {
  const { data, isPending } = authClient.useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isPending) return <LoadingScreen />
  if (!data && pathname !== "/login") return <Navigate to="/login" />
  if (data && pathname === "/login") return <Navigate to="/" />
  if (pathname === "/login") return <Outlet />

  return (
    <QueryClientProvider client={queryClient}>
      <RegistryProvider>
        <ProjectsProvider>
          <WorkspaceGate>
            <AppShell>
              <Outlet />
            </AppShell>
          </WorkspaceGate>
          <Toaster />
        </ProjectsProvider>
      </RegistryProvider>
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: Gate,
})
