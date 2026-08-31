import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
vi.mock("../trpc", async () => {
  const { createTrpcMock } = await import("../../test/mocks.ts")
  return { trpc: createTrpcMock() }
})

import { trpc } from "../trpc/index.ts"

import { RegistryProvider, useRegistry } from "./index"

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client },
      createElement(RegistryProvider, null, children),
    )
  }
}

describe("registry-store", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => useRegistry())).toThrow(/RegistryProvider/)
  })

  it("loads and mutates the registry", async () => {
    trpc.contacts.list.query.mockResolvedValue([{ id: "c1", name: "Ada" }])
    trpc.tools.listCustom.query.mockResolvedValue([{ id: "t1", name: "CI", category: "deploy" }])
    const { result } = renderHook(() => useRegistry(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.findContact("c1")?.name).toBe("Ada")
    await act(async () => {
      await result.current.addContact({ name: "Bo" })
      await result.current.updateContact("c1", { name: "Ada Lovelace" })
      await result.current.removeContact("c1")
      await result.current.addCustomTool({ name: "CI", category: "deploy" })
      await result.current.updateCustomTool("t1", { name: "CD", category: "other" })
      await result.current.removeCustomTool("t1")
    })
    trpc.contacts.create.mutate.mockRejectedValueOnce(new Error("nope"))
    await act(async () => {
      await result.current.addContact({ name: "X" }).catch(() => undefined)
    })
  })
})
