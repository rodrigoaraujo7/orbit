import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs"

afterEach(() => {
  cleanup()
  vi.mocked(Element.prototype.scrollIntoView).mockClear()
})

describe("Tabs", () => {
  it("keeps the scroll position when the active tab changes", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <Tabs defaultValue="one" onValueChange={onValueChange}>
        <TabsList>
          <TabsTab value="one">One</TabsTab>
          <TabsTab value="two">Two</TabsTab>
        </TabsList>
        <TabsPanel value="one">First</TabsPanel>
        <TabsPanel value="two">Second</TabsPanel>
      </Tabs>,
    )

    await user.click(screen.getByRole("tab", { name: "Two" }))

    expect(screen.getByText("Second")).toBeVisible()
    expect(onValueChange).toHaveBeenCalledWith("two", expect.anything())
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })
})
