import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/toast'
import i18n from '@/i18n'
import { authClient } from '@/lib/auth-client'
import { ProjectsProvider, useProjects } from '@/lib/projects-store'
import { RegistryProvider, useRegistry } from '@/lib/registry-store'

const queryClient = new QueryClient()

function LoadingScreen({ message }: { message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">
      {message ?? t('common.loading')}
    </div>
  )
}

function WorkspaceGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { isPending: projectsPending, isError: projectsError } = useProjects()
  const { isPending: registryPending, isError: registryError } = useRegistry()
  if (projectsPending || registryPending) return <LoadingScreen />
  if (projectsError || registryError) {
    return <LoadingScreen message={t('common.loadError')} />
  }
  return children
}

function Gate() {
  const { data, isPending } = authClient.useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isPending) return <LoadingScreen />
  if (!data && pathname !== '/login') return <Navigate to="/login" />
  if (data && pathname === '/login') return <Navigate to="/" />
  if (pathname === '/login') return <Outlet />

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
