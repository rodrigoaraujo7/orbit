import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
vi.mock("../trpc", async () => {
  const { createTrpcMock } = await import("../../test/mocks.ts")
  return { trpc: createTrpcMock() }
})

import { trpc } from "../trpc/index.ts"

import { ProjectsProvider, useProjects } from "./index"
import type { Project } from "@/data/projects"

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client },
      createElement(ProjectsProvider, null, children),
    )
  }
}

const sample: Project = {
  id: "p1",
  name: "Portal",
  clientId: "c1",
  status: "queued",
  startedAt: "2026-01-01",
  deal: { kind: "upfront", amount: 0 },
  tools: [],
}

describe("projects-store", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => useProjects())).toThrow(/ProjectsProvider/)
  })

  it("loads, mutates and moves projects", async () => {
    trpc.projects.list.query.mockResolvedValue([sample])
    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.findProject("p1")?.name).toBe("Portal")
    await act(async () => {
      await result.current.addProject(sample)
      await result.current.updateProject({ ...sample, name: "New" })
      result.current.moveProject("p1", "in-development", 0)
      result.current.replaceProjects([{ ...sample, name: "Bulk" }])
      await result.current.deleteProject("p1")
    })
    result.current.moveProject("missing", "queued", 0)
    trpc.projects.create.mutate.mockRejectedValueOnce(new Error("nope"))
    await act(async () => {
      await result.current.addProject(sample).catch(() => undefined)
    })
  })
})
