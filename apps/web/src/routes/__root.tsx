import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { I18nextProvider, useTranslation } from "react-i18next"

import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toast"
import i18n from "@/i18n"
import { authClient } from "@/lib/auth-client"
import { ProjectsProvider, useProjects } from "@/lib/projects-store"
import { RegistryProvider, useRegistry } from "@/lib/registry-store"
import { renderedPathname, showStopScreen } from "./-rendered-path"

const queryClient = new QueryClient()

/** Reached without a session: sign-in plus the two password recovery screens. */
const PUBLIC_ROUTES = new Set(["/login", "/forgot-password", "/reset-password"])

function LoadingScreen({ message }: { message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">
      {message ?? t("common.loading")}
    </div>
  )
}

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

function WorkspaceProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RegistryProvider>
        <ProjectsProvider>{children}</ProjectsProvider>
      </RegistryProvider>
    </QueryClientProvider>
  )
}

function Gate() {
  const { data, isPending } = authClient.useSession()
  const { pathname, isNotFound, isRouteError, status, matches } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      status: s.status,
      matches: s.matches,
      isNotFound: (s.matches ?? []).some(
        (match) => match?.status === "notFound" || match?._notFound,
      ),
      isRouteError: (s.matches ?? []).some((match) => match?.status === "error"),
    }),
  })

  const activePath = renderedPathname(pathname, status, matches, (path) => PUBLIC_ROUTES.has(path))
  const isPublic = PUBLIC_ROUTES.has(activePath)
  const stopScreen = showStopScreen(status, isNotFound, isRouteError)

  if (isPending && !isPublic) return <LoadingScreen />
  if (!data && !isPublic && !stopScreen) {
    // The address is already public, but the private page is still mounted.
    // Redirecting again restarts the navigation and never lets login paint.
    if (PUBLIC_ROUTES.has(pathname)) {
      return (
        <WorkspaceProviders>
          <Outlet />
        </WorkspaceProviders>
      )
    }
    return <Navigate to="/login" />
  }
  if (data && isPublic) return <Navigate to="/" />
  if (isPublic) return <Outlet />
  if (stopScreen) {
    return (
      <WorkspaceProviders>
        <div className="min-h-svh">
          <Outlet />
        </div>
      </WorkspaceProviders>
    )
  }

  return (
    <WorkspaceProviders>
      <WorkspaceGate>
        <AppShell>
          <Outlet />
        </AppShell>
      </WorkspaceGate>
      <Toaster />
    </WorkspaceProviders>
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
