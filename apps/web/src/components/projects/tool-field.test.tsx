import { FormProvider, useForm } from "react-hook-form"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OTHER_TOOL_ID } from "@/data/tool-catalog"
import { emptyProjectForm, emptyToolForm, type ProjectFormValues } from "@/lib/project-schema"
import { ToolField } from "./tool-field"
import { renderWithProviders } from "@/test/render"

afterEach(() => {
  cleanup()
})

function Harness({
  tool = emptyToolForm,
  onRemove = vi.fn(),
}: {
  tool?: ProjectFormValues["tools"][number]
  onRemove?: () => void
}) {
  const form = useForm<ProjectFormValues>({
    defaultValues: { ...emptyProjectForm, tools: [tool] },
  })
  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void form.trigger()
        }}
      >
        <ToolField index={0} onRemove={onRemove} />
        <button type="submit">Validate</button>
      </form>
    </FormProvider>
  )
}

describe("ToolField", () => {
  it("removes the tool, adds secrets and reveals them", async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    renderWithProviders(<Harness onRemove={onRemove} />)
    await user.click(screen.getByRole("button", { name: "Remove tool" }))
    expect(onRemove).toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Add" }))
    expect(screen.getByPlaceholderText("API_KEY")).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText("value"), "abc")
    expect(screen.getByPlaceholderText("value")).toHaveAttribute("type", "password")
    await user.click(screen.getByRole("button", { name: "Reveal value" }))
    expect(screen.getByPlaceholderText("value")).toHaveAttribute("type", "text")
    await user.click(screen.getByRole("button", { name: "Hide value" }))
    await user.click(screen.getByRole("button", { name: "Remove secret" }))
    expect(screen.queryByPlaceholderText("API_KEY")).not.toBeInTheDocument()
  })

  it("asks for a custom name for other tools and unlocks billing when paid", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Harness
        tool={{
          ...emptyToolForm,
          toolId: OTHER_TOOL_ID,
          amount: "0",
        }}
      />,
    )
    expect(screen.getByPlaceholderText("TOTVS Protheus API")).toBeInTheDocument()
    expect(screen.getByText("Free")).toBeInTheDocument()
    const amount = screen.getByPlaceholderText("0")
    await user.click(amount)
    await user.clear(amount)
    await user.type(amount, "40")
    expect(screen.queryByText("Free")).not.toBeInTheDocument()
  })

  it("shows secret field errors", async () => {
    const user = userEvent.setup()
    function Errors() {
      const form = useForm<ProjectFormValues>({
        defaultValues: {
          ...emptyProjectForm,
          tools: [{ ...emptyToolForm, secrets: [{ key: "", value: "" }] }],
        },
      })
      return (
        <FormProvider {...form}>
          <button
            type="button"
            onClick={() => {
              form.setError("tools.0.secrets.0.key", { message: "Enter the key" })
              form.setError("tools.0.toolId", { message: "Select a tool" })
            }}
          >
            Set errors
          </button>
          <ToolField index={0} onRemove={vi.fn()} />
        </FormProvider>
      )
    }
    renderWithProviders(<Errors />)
    await user.click(screen.getByRole("button", { name: "Set errors" }))
    expect(screen.getByText("Enter the key")).toBeInTheDocument()
    expect(screen.getAllByText("Select a tool").length).toBeGreaterThan(0)
  })

  it("shows a secret value error and changes paid billing fields", async () => {
    const user = userEvent.setup()
    function ValueError() {
      const form = useForm<ProjectFormValues>({
        defaultValues: {
          ...emptyProjectForm,
          tools: [{ ...emptyToolForm, amount: "40", secrets: [{ key: "K", value: "" }] }],
        },
      })
      return (
        <FormProvider {...form}>
          <button
            type="button"
            onClick={() => {
              form.setError("tools.0.secrets.0.value", { message: "Enter the value" })
            }}
          >
            Set value error
          </button>
          <ToolField index={0} onRemove={vi.fn()} />
        </FormProvider>
      )
    }
    renderWithProviders(<ValueError />)
    await user.click(screen.getByRole("button", { name: "Set value error" }))
    expect(screen.getByText("Enter the value")).toBeInTheDocument()
    const amount = screen.getByPlaceholderText("0")
    await user.click(amount)
    await user.click(screen.getAllByRole("combobox").find((el) => el.textContent?.includes("Monthly"))!)
    await user.click(await screen.findByRole("option", { name: "Yearly" }))
    await user.click(screen.getAllByRole("combobox").find((el) => /I pay|Me/.test(el.textContent ?? ""))!)
    await user.click(await screen.findByRole("option", { name: /Client/ }))
  })

  it("treats a missing amount as free", () => {
    renderWithProviders(
      <Harness
        tool={{
          ...emptyToolForm,
          amount: undefined as unknown as string,
        }}
      />,
    )
    expect(screen.getByText("Free")).toBeInTheDocument()
  })
})
