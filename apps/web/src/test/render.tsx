import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, within, type RenderOptions } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const client = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nextProvider>
    )
  }
  return { ...render(ui, { wrapper: Wrapper, ...options }), client }
}

export function filterDrawer() {
  const el = document.querySelector("[data-slot='drawer-content']")
  if (!el) throw new Error("filter drawer is not open")
  return within(el as HTMLElement)
}
