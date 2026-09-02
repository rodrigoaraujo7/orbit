import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { WorkflowRun } from "shared"
import { sampleWorkflowRun } from "@/test/fixtures"
import { renderWithProviders } from "@/test/render"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to }: { children?: ReactNode; to?: string }) => (
      <a href={String(to)}>{children}</a>
    ),
  }
})

import { LiveIndicator, WorkflowRunsEmpty, WorkflowRunsTable } from "./index"

function run(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return { ...sampleWorkflowRun, ...overrides }
}

function renderTable(props: Partial<Parameters<typeof WorkflowRunsTable>[0]> = {}) {
  return renderWithProviders(
    <WorkflowRunsTable
      runs={[run()]}
      branches={["main", "dev"]}
      branch="main"
      defaultBranch="main"
      onBranchChange={vi.fn()}
      streamStatus="live"
      isPending={false}
      isFetching={false}
      {...props}
    />,
  )
}

afterEach(() => {
  cleanup()
})

describe("LiveIndicator", () => {
  it("names every connection state", () => {
    for (const [status, label] of [
      ["connecting", "Connecting…"],
      ["live", "Live"],
      ["polling", "Polling"],
      ["offline", "Offline"],
    ] as const) {
      renderWithProviders(<LiveIndicator status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      cleanup()
    }
  })
})

describe("WorkflowRunsEmpty", () => {
  it("shows a message on its own", () => {
    renderWithProviders(<WorkflowRunsEmpty message="No repository" />)
    expect(screen.getByText("No repository")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("offers a way out when given one", () => {
    renderWithProviders(
      <WorkflowRunsEmpty
        message="Connect first"
        action={{ label: "Open settings", to: "/settings" }}
      />,
    )
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute("href", "/settings")
  })
})

describe("WorkflowRunsTable", () => {
  it("renders a run with its status, commit and duration", () => {
    renderTable()
    expect(screen.getByText("ci")).toBeInTheDocument()
    expect(screen.getByText("#42 · push")).toBeInTheDocument()
    expect(screen.getByText("ship the portal")).toBeInTheDocument()
    expect(screen.getByText("abc1234")).toBeInTheDocument()
    expect(screen.getByText("ada")).toBeInTheDocument()
    expect(screen.getByText("2m 0s")).toBeInTheDocument()
    expect(screen.getByText("Passed")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open run on GitHub" })).toHaveAttribute(
      "href",
      sampleWorkflowRun.url,
    )
  })

  it("leaves the duration blank while a run is still going", () => {
    renderTable({ runs: [run({ status: "running", durationMs: null })] })
    expect(screen.getByText("Running")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("says so when the branch has no runs", () => {
    renderTable({ runs: [] })
    expect(screen.getByText("No Actions runs on this branch.")).toBeInTheDocument()
  })

  it("shows a skeleton on the first load", () => {
    const { container } = renderTable({ runs: [], isPending: true })
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
    expect(screen.queryByText("No Actions runs on this branch.")).not.toBeInTheDocument()
  })

  it("picks another branch and marks the default one", async () => {
    const onBranchChange = vi.fn()
    const user = userEvent.setup()
    renderTable({ onBranchChange })

    await user.click(screen.getByRole("combobox", { name: "Branch" }))
    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByText("default")).toBeInTheDocument()

    await user.click(within(listbox).getByRole("option", { name: /dev/ }))
    expect(onBranchChange).toHaveBeenCalledWith("dev")
  })

  it("keeps a branch that no longer exists on GitHub selectable", async () => {
    const user = userEvent.setup()
    renderTable({ branch: "gone", branches: ["main"] })

    await user.click(screen.getByRole("combobox", { name: "Branch" }))
    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByRole("option", { name: /gone/ })).toBeInTheDocument()
  })

  it("sorts on every column, including runs with no duration yet", async () => {
    const user = userEvent.setup()
    renderTable({
      runs: [
        run({ id: 1, name: "ci", runNumber: 1, actor: "ada", title: "first" }),
        run({
          id: 2,
          name: "release",
          runNumber: 2,
          actor: "bob",
          title: "second",
          status: "running",
          durationMs: null,
          startedAt: "2026-09-02T10:00:00.000Z",
        }),
      ],
    })

    for (const header of ["Status", "Workflow", "Commit", "Triggered by", "Started", "Duration"]) {
      await user.click(screen.getByRole("button", { name: header }))
      expect(screen.getAllByRole("row")).toHaveLength(3)
    }

    // descending on the last column clicked, so the null duration sorts first
    await user.click(screen.getByRole("button", { name: "Duration" }))
    const [, firstRow] = screen.getAllByRole("row")
    expect(within(firstRow!).getByText("2m 0s")).toBeInTheDocument()
  })

  it("disables the select until the branch list arrives", () => {
    renderTable({ branches: [], branch: "" })
    expect(screen.getByRole("combobox", { name: "Branch" })).toBeDisabled()
    expect(screen.getByText("Branch")).toBeInTheDocument()
  })
})
