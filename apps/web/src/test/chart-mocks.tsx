import { isValidElement, type ReactElement, type ReactNode } from "react"

const samplePayload = [
  {
    name: "recebido",
    value: 10,
    payload: {
      month: "2026-01",
      name: "Portal",
      receita: 100,
      custo: 20,
      lucro: 80,
      margem: 0.8,
      novos: 2,
      clientes: 3,
      projetos: ["Portal"],
    },
  },
]

const emptyNovosPayload = [
  {
    name: "unknown",
    value: 0,
    payload: {
      month: "2026-01",
      name: "Portal",
      receita: 0,
      custo: 0,
      lucro: 0,
      margem: 0,
      novos: 0,
      clientes: 0,
      projetos: [],
    },
  },
]

export function invokeChartTooltip(content: ReactNode) {
  if (!isValidElement(content)) return null
  const props = (content as ReactElement<{
    labelFormatter?: (label: unknown, payload: unknown[]) => unknown
    formatter?: (value: unknown, name: unknown, item: unknown) => unknown
  }>).props
  props.labelFormatter?.("", samplePayload)
  props.formatter?.(10, "recebido", samplePayload[0])
  props.formatter?.(10, "eu", samplePayload[0])
  props.formatter?.(10, "cliente", samplePayload[0])
  props.formatter?.(0, "unknown", emptyNovosPayload[0])
  return <div data-testid="chart-tooltip" />
}

export function rechartsStub() {
  return {
    Area: () => null,
    AreaChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Bar: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    BarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    CartesianGrid: () => null,
    LabelList: ({ formatter }: { formatter?: (value: unknown) => string }) => (
      <span data-testid="chart-label">{formatter?.(2500)}</span>
    ),
    ReferenceLine: () => null,
    XAxis: ({ tickFormatter }: { tickFormatter?: (value: string) => string }) => (
      <span>{tickFormatter?.("2026-01")}</span>
    ),
    YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
      <span>{tickFormatter?.(1500)}</span>
    ),
  }
}
