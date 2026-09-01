import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sampleProject } from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"
import type { ReactNode } from "react"

const moveProject = vi.fn()
const motion = vi.hoisted(() => ({ reduced: true }))
const dnd = vi.hoisted(() => ({
  onDragStart: undefined as ((event: unknown) => void) | undefined,
  onDragOver: undefined as ((event: unknown) => void) | undefined,
  onDragEnd: undefined as ((event: unknown) => void) | undefined,
  dropAnimation: undefined as unknown,
}))

vi.mock("@/lib/projects-store", () => ({
  useProjects: () => ({
    projects: [],
    isPending: false,
    isError: false,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    moveProject,
    replaceProjects: vi.fn(),
    deleteProject: vi.fn(),
    findProject: vi.fn(),
  }),
  ProjectsProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@dnd-kit/dom", () => ({
  PointerActivationConstraints: {
    Distance: class Distance {
      constructor(_options: { value: number }) {}
    },
  },
}))

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
  }: {
    children: ReactNode
    onDragStart?: (event: unknown) => void
    onDragOver?: (event: unknown) => void
    onDragEnd?: (event: unknown) => void
  }) => {
    dnd.onDragStart = onDragStart
    dnd.onDragOver = onDragOver
    dnd.onDragEnd = onDragEnd
    return <div data-testid="board">{children}</div>
  },
  DragOverlay: ({
    dropAnimation,
    children,
  }: {
    dropAnimation?: unknown
    children: (source: { id: string }) => ReactNode
  }) => {
    dnd.dropAnimation = dropAnimation
    return (
      <div data-testid="overlay">
        {children({ id: "p1" })}
        {children({ id: "missing" })}
      </div>
    )
  },
  KeyboardSensor: {},
  PointerSensor: { configure: () => ({}) },
  useDroppable: () => ({ ref: () => undefined, isDropTarget: false }),
}))

vi.mock("@dnd-kit/react/sortable", () => ({
  isSortable: (source: unknown) => Boolean(source),
  useSortable: () => ({ ref: () => undefined, isDragging: false }),
}))

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => motion.reduced,
}))

import { KanbanBoard } from "./index"

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  moveProject.mockClear()
  motion.reduced = true
})

const queued = { ...sampleProject, id: "p1", status: "queued" as const, endedAt: undefined }
const building = { ...sampleProject, id: "p2", name: "Shop", status: "in-development" as const }

describe("KanbanBoard", () => {
  it("renders columns and invokes drag handlers", () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <KanbanBoard
        projects={[queued, building]}
        clientName={() => "Ada"}
        onOpen={onOpen}
      />,
    )
    expect(screen.getAllByText("Portal").length).toBeGreaterThan(0)
    expect(screen.getByText("Shop")).toBeInTheDocument()
    expect(screen.getAllByText("No projects").length).toBeGreaterThan(0)

    act(() => {
      dnd.onDragStart?.({})
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: null, target: { id: "queued" } },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: null },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "p1" } },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "unknown" } },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "completed" } },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "completed" } },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "p2" } },
      })
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "completed" } },
      })

      dnd.onDragEnd?.({ canceled: true, operation: { source: { id: "p1" } } })
      dnd.onDragStart?.({})
      dnd.onDragOver?.({
        preventDefault: vi.fn(),
        operation: { source: { id: "p1" }, target: { id: "paused" } },
      })
      dnd.onDragEnd?.({ canceled: false, operation: { source: { id: "p1" } } })
    })
    expect(moveProject).toHaveBeenCalled()

    act(() => {
      dnd.onDragEnd?.({ canceled: false, operation: { source: null } })
      dnd.onDragEnd?.({ canceled: false, operation: { source: { id: "ghost" } } })
    })

    const card = screen.getByRole("button", { name: /Portal/ })
    fireEvent.click(card)
    fireEvent.keyDown(card, { key: "Enter" })
    expect(onOpen).toHaveBeenCalledWith("p1")
  })

  it("ignores project list updates while dragging and restores a canceled drag", () => {
    const { rerender } = renderWithProviders(
      <KanbanBoard projects={[queued, building]} clientName={() => "Ada"} onOpen={vi.fn()} />,
    )
    act(() => {
      dnd.onDragStart?.({})
    })
    rerender(
      <KanbanBoard
        projects={[{ ...queued, name: "Portal 2" }]}
        clientName={() => "Ada"}
        onOpen={vi.fn()}
      />,
    )
    act(() => {
      dnd.onDragEnd?.({ canceled: true, operation: { source: { id: "p1" } } })
      dnd.onDragEnd?.({ canceled: true, operation: { source: { id: "p1" } } })
    })
    expect(screen.getAllByText("Portal 2").length).toBeGreaterThan(0)
  })

  it("uses the default drop animation when motion is not reduced", () => {
    motion.reduced = false
    renderWithProviders(
      <KanbanBoard projects={[queued]} clientName={() => "Ada"} onOpen={vi.fn()} />,
    )
    expect(dnd.dropAnimation).toBeUndefined()
  })
})
