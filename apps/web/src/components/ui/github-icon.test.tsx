import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GitHubIcon } from "./github-icon"

describe("GitHubIcon", () => {
  it("renders the brand mark", () => {
    const { container } = render(<GitHubIcon className="size-4" />)
    expect(container.querySelector("svg")).toHaveClass("size-4")
  })
})
