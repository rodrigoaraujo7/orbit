import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { sampleProject } from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"

const dropTarget = vi.hoisted(() => ({ value: false }))

vi.mock("@dnd-kit/react", () => ({
  useDroppable: () => ({ ref: () => undefined, isDropTarget: dropTarget.value }),
}))

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({ ref: () => undefined, isDragging: false }),
}))

import { KanbanColumn } from "./index"

afterEach(() => {
  cleanup()
  dropTarget.value = false
})

describe("KanbanColumn", () => {
  it("shows an empty column", () => {
    renderWithProviders(
      <KanbanColumn
        status="queued"
        projects={[]}
        clientName={() => "Ada"}
        reducedMotion
        onOpen={vi.fn()}
      />,
    )
    expect(screen.getByText("Queued")).toBeInTheDocument()
    expect(screen.getByText("No projects")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders cards and highlights a drop target", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    dropTarget.value = true
    renderWithProviders(
      <KanbanColumn
        status="in-development"
        projects={[sampleProject]}
        clientName={() => "Ada"}
        reducedMotion={false}
        onOpen={onOpen}
      />,
    )
    expect(screen.getByText("Portal")).toBeInTheDocument()
    await user.click(screen.getByText("Portal"))
    expect(onOpen).toHaveBeenCalledWith("p1")
  })
})
