import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
import { GithubPanel } from "./index"

const webhook = {
  url: "https://example.test/api/github/webhook/hook-1",
  secret: "hook-secret",
}

const connected = { connected: true, login: "ada", webhook }

const disconnected = { connected: false, login: null, webhook: null }

const writeText = vi.fn().mockResolvedValue(undefined)

/** userEvent.setup() installs its own clipboard, so ours has to come after it. */
function setupUser() {
  const user = userEvent.setup()
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
  return user
}

beforeEach(() => {
  toastAdd.mockClear()
  trpc.github.status.query.mockResolvedValue(disconnected)
  trpc.github.connect.mutate.mockResolvedValue({ login: "ada", webhook })
  trpc.github.disconnect.mutate.mockResolvedValue({ ok: true })
  writeText.mockClear()
  writeText.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function confirmDisconnect(user: ReturnType<typeof setupUser>) {
  const dialog = await screen.findByRole("dialog")
  await user.type(within(dialog).getByRole("textbox"), "disconnect")
  await user.click(within(dialog).getByRole("button", { name: "Disconnect" }))
}

describe("GithubPanel", () => {
  it("connects with a token and reports success", async () => {
    const user = setupUser()
    renderWithProviders(<GithubPanel />)

    const field = await screen.findByLabelText(/Personal access token/)
    await user.type(field, "ghp_secret")
    await user.click(screen.getByRole("button", { name: "Connect" }))

    expect(trpc.github.connect.mutate).toHaveBeenCalledWith({ token: "ghp_secret" })
    await vi.waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })),
    )
  })

  it("shows progress while GitHub verifies the token", async () => {
    trpc.github.connect.mutate.mockReturnValue(new Promise(() => {}))
    const user = setupUser()
    renderWithProviders(<GithubPanel />)

    await user.type(await screen.findByLabelText(/Personal access token/), "ghp_secret")
    await user.click(screen.getByRole("button", { name: "Connect" }))

    const button = await screen.findByRole("button", { name: "Connecting…" })
    expect(button).toBeDisabled()
  })

  it("refuses an empty token without calling the API", async () => {
    const user = setupUser()
    renderWithProviders(<GithubPanel />)

    await user.click(await screen.findByRole("button", { name: "Connect" }))
    expect(await screen.findByText("Enter the GitHub token")).toBeInTheDocument()
    expect(trpc.github.connect.mutate).not.toHaveBeenCalled()
  })

  it("reports a token GitHub rejects", async () => {
    trpc.github.connect.mutate.mockRejectedValue(new Error("nope"))
    const user = setupUser()
    renderWithProviders(<GithubPanel />)

    await user.type(await screen.findByLabelText(/Personal access token/), "bad")
    await user.click(screen.getByRole("button", { name: "Connect" }))
    await vi.waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    )
  })

  it("shows the account and the webhook credentials once connected", async () => {
    trpc.github.status.query.mockResolvedValue(connected)
    renderWithProviders(<GithubPanel />)

    expect(await screen.findByText("Connected as ada")).toBeInTheDocument()
    expect(screen.getByText(webhook.url)).toBeInTheDocument()
    expect(screen.getByText(webhook.secret)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Personal access token/)).not.toBeInTheDocument()
  })

  it("names a token GitHub cannot identify", async () => {
    trpc.github.status.query.mockResolvedValue({ ...connected, login: null })
    renderWithProviders(<GithubPanel />)
    expect(await screen.findByText(/does not name/)).toBeInTheDocument()
  })

  it("hides the webhook section when the server sends no credentials", async () => {
    trpc.github.status.query.mockResolvedValue({ ...connected, webhook: null })
    renderWithProviders(<GithubPanel />)
    expect(await screen.findByText("Connected as ada")).toBeInTheDocument()
    expect(screen.queryByText("Real-time webhook")).not.toBeInTheDocument()
  })

  it("copies the webhook credentials and reports a clipboard failure", async () => {
    trpc.github.status.query.mockResolvedValue(connected)
    const user = setupUser()
    renderWithProviders(<GithubPanel />)

    await user.click(await screen.findByRole("button", { name: "Copy Payload URL" }))
    expect(writeText).toHaveBeenCalledWith(webhook.url)
    await vi.waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })),
    )

    writeText.mockRejectedValue(new Error("denied"))
    await user.click(screen.getByRole("button", { name: "Copy Secret" }))
    await vi.waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    )
  })

  it("disconnects after confirmation and reports a failure", async () => {
    trpc.github.status.query.mockResolvedValue(connected)
    const user = setupUser()
    renderWithProviders(<GithubPanel />)

    await user.click(await screen.findByRole("button", { name: /Disconnect/ }))
    await confirmDisconnect(user)
    expect(trpc.github.disconnect.mutate).toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })),
    )

    toastAdd.mockClear()
    trpc.github.disconnect.mutate.mockRejectedValue(new Error("nope"))
    await user.click(screen.getByRole("button", { name: /Disconnect/ }))
    await confirmDisconnect(user)
    await vi.waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    )
  })
})
