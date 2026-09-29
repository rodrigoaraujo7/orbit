import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getDictionary } from "@/i18n"
import { Faq } from "./index"

describe("Faq", () => {
  it("uses native disclosures", () => {
    render(<Faq dictionary={getDictionary("en")} />)
    expect(screen.getByRole("heading", { name: "Questions" })).toBeInTheDocument()
    for (const name of [
      "Who is this for?",
      "Where does my data live?",
      "Can I store API keys and logins?",
      "How do I start?",
    ]) {
      expect(screen.getByText(name).tagName).toBe("SUMMARY")
    }
  })
})
