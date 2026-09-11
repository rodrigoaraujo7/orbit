import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SECRET_VALUE_MASK } from "@/data/projects"
import { sampleTool } from "@/test/fixtures"
import { ToolDetails } from "./index"
import { renderWithProviders } from "@/test/render"

const toastAdd = vi.fn()

vi.mock("@/components/ui/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/toast")>()
  return { ...actual, toast: { add: (...args: unknown[]) => toastAdd(...args) } }
})

vi.mock("@/lib/trpc", async () => {
  const { createTrpcMock } = await import("@/test/mocks")
  return { trpc: createTrpcMock() }
})

import { trpc } from "@/lib/trpc"

afterEach(() => {
  cleanup()
  toastAdd.mockClear()
  trpc.credentials.reveal.mutate.mockReset()
  trpc.credentials.reveal.mutate.mockResolvedValue({
    id: "sec-1",
    label: "API_KEY",
    value: "sk_live",
  })
})

describe("ToolDetails", () => {
  it("renders billing, secrets, copy success and reveal", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })
    renderWithProviders(<ToolDetails tool={sampleTool} />)
    expect(screen.getAllByText("Vercel").length).toBeGreaterThan(0)
    expect(screen.getByText(/Account:/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit secret" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    expect(screen.getByText("secret-value")).toBeInTheDocument()
    await user.click(screen.getByText("secret-value"))
    expect(writeText).toHaveBeenCalledWith("secret-value")
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
    await user.click(screen.getByRole("button", { name: "Hide value" }))
  })

  it("opens the secret editor to the right of reveal when the secret has an id", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ id: "sec-1", key: "API_KEY", value: "" }],
        }}
      />,
    )
    const edit = screen.getByRole("button", { name: "Edit secret" })
    const reveal = screen.getByRole("button", { name: "Reveal value" })
    expect(reveal.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(edit)
    expect(await screen.findByText("Edit secret")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByText("Edit secret")).not.toBeInTheDocument()
  })

  it("loads the stored secret from the API when revealing", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ id: "sec-1", key: "TESTE_SECRET", value: "" }],
        }}
      />,
    )
    expect(screen.getByText(SECRET_VALUE_MASK)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    expect(await screen.findByText("sk_live")).toBeInTheDocument()
    expect(trpc.credentials.reveal.mutate).toHaveBeenCalledWith({ id: "sec-1" })
    await user.click(screen.getByRole("button", { name: "Hide value" }))
    expect(screen.queryByText("sk_live")).not.toBeInTheDocument()
    expect(screen.getByText(SECRET_VALUE_MASK)).toBeInTheDocument()
  })

  it("reports reveal errors without showing an empty value", async () => {
    const user = userEvent.setup()
    trpc.credentials.reveal.mutate.mockRejectedValueOnce(new Error("nope"))
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ id: "sec-1", key: "TESTE_SECRET", value: "" }],
        }}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not reveal the secret", type: "error" }),
      ),
    )
    expect(screen.getByText(SECRET_VALUE_MASK)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reveal value" })).toBeInTheDocument()
  })

  it("reports reveal errors for a missing id, empty value, or non-Error throw", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ key: "TOKEN", value: "" }],
        }}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not reveal the secret", type: "error" }),
      ),
    )
    cleanup()
    toastAdd.mockClear()

    trpc.credentials.reveal.mutate.mockResolvedValueOnce({
      id: "sec-1",
      label: "API_KEY",
      value: "",
    })
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ id: "sec-1", key: "TESTE_SECRET", value: "" }],
        }}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not reveal the secret", type: "error" }),
      ),
    )
    cleanup()
    toastAdd.mockClear()

    trpc.credentials.reveal.mutate.mockRejectedValueOnce("nope")
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ id: "sec-1", key: "TESTE_SECRET", value: "" }],
        }}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not reveal the secret", type: "error" }),
      ),
    )
  })

  it("reports copy errors when revealing the stored secret fails", async () => {
    const user = userEvent.setup()
    trpc.credentials.reveal.mutate.mockRejectedValueOnce(new Error("TOO_MANY_REQUESTS"))
    renderWithProviders(
      <ToolDetails
        tool={{
          ...sampleTool,
          secrets: [{ id: "sec-1", key: "TESTE_SECRET", value: "" }],
        }}
      />,
    )
    await user.click(screen.getByText(SECRET_VALUE_MASK))
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Too many reveal attempts. Try again later.",
          type: "error",
        }),
      ),
    )
  })

  it("shows a free badge, missing account and copy errors", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    renderWithProviders(
      <ToolDetails
        tool={{
          id: "other",
          name: "Custom",
          category: "other",
          secrets: [{ key: "TOKEN", value: "abc" }],
        }}
      />,
    )
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("not registered")).toBeInTheDocument()
    await user.click(screen.getByText(SECRET_VALUE_MASK))
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
  })
})
