import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { I18nextProvider, useTranslation } from "react-i18next"

import { AppShell } from "@/components/layout/app-shell"
import { LoadingScreen } from "@/components/layout/loading-screen"
import { Toaster } from "@/components/ui/toast"
import i18n from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { ProjectsProvider, useProjects } from "@/lib/projects-store"
import { RegistryProvider, useRegistry } from "@/lib/registry-store"

const queryClient = new QueryClient()

/** Reached without a session: sign-in plus the two password recovery screens. */
const PUBLIC_ROUTES = new Set(["/login", "/forgot-password", "/reset-password"])

function WorkspaceGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { isPending: projectsPending, isError: projectsError } = useProjects()
  const { isPending: registryPending, isError: registryError } = useRegistry()
  if (projectsPending || registryPending) return <LoadingScreen />
  if (projectsError || registryError) {
    return <LoadingScreen message={t("common.loadError")} />
  }
  return children
}

function Gate() {
  const { data, isPending } = authClient.useSession()
  const { pathname, isNotFound, isRouteError } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      isNotFound: (s.matches ?? []).some((match) => match.status === "notFound" || match._notFound),
      isRouteError: (s.matches ?? []).some((match) => match.status === "error"),
    }),
  })

  const isPublic = PUBLIC_ROUTES.has(pathname)

  if (isPending && !isPublic) return <LoadingScreen />
  if (!data && !isPublic && !isNotFound) return <Navigate to="/login" />
  if (data && isPublic) return <Navigate to="/" />
  if (isPublic) return <Outlet />
  if (isNotFound || isRouteError) {
    return (
      <div className="min-h-svh">
        <Outlet />
      </div>
    )
  }

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

function Root() {
  return (
    <I18nextProvider i18n={i18n}>
      <Gate />
    </I18nextProvider>
  )
}

export const Route = createRootRoute({
  component: Root,
})
