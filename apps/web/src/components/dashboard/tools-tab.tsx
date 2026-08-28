import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { ChartCard, NoData, StatRow, StatTile } from "@/components/dashboard/cards";
import { axisProps, surfaceGap, useChartMotion } from "@/components/dashboard/chart-parts";
import { ToolIcon } from "@/components/projects/tool-icons";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DataTable, type Column } from "@/components/ui/table";
import { BILLING_CYCLE_LABEL, PAYER_LABEL } from "@/data/projects";
import { TOOL_CATEGORY_LABEL } from "@/data/tool-catalog";
import type {
  CategoryCost,
  CostMonth,
  ToolCost,
  ToolRow,
  ToolsSummary,
} from "shared";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonth,
  formatMonthLong,
} from "@/lib/format";

// Two payers, two fixed slots. "Eu" keeps the brand hue because it is the
// number that actually comes out of the freelancer's pocket.
const payerConfig = {
  eu: { label: "Eu pago", color: "var(--chart-1)" },
  cliente: { label: "Cliente paga", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ToolsTab({
  summary,
  byTool,
  byCategory,
  byMonth,
  rows,
  months,
  currency,
}: {
  summary: ToolsSummary
  byTool: ToolCost[]
  byCategory: CategoryCost[]
  byMonth: CostMonth[]
  rows: ToolRow[]
  months: string[]
  currency: string
}) {
  const motion = useChartMotion();

  const money = (value: number) => formatCurrency(value, currency);

  const columns: Column<ToolRow>[] = [
    {
      key: "name",
      header: "Ferramenta",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <ToolIcon id={row.toolId} className="size-3.5" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "project",
      header: "Projeto",
      sortValue: (row) => row.projectName,
      cell: (row) => <span className="text-muted-foreground">{row.projectName}</span>,
    },
    {
      key: "category",
      header: "Categoria",
      className: "hidden md:table-cell",
      sortValue: (row) => row.category,
      cell: (row) => (
        <span className="text-muted-foreground">{TOOL_CATEGORY_LABEL[row.category]}</span>
      ),
    },
    {
      key: "account",
      header: "Conta",
      className: "hidden lg:table-cell",
      sortValue: (row) => row.account,
      cell: (row) => <span className="truncate text-muted-foreground">{row.account}</span>,
    },
    {
      key: "amount",
      header: "Valor",
      className: "hidden sm:table-cell whitespace-nowrap",
      sortValue: (row) => row.amount,
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {money(row.amount)} · {BILLING_CYCLE_LABEL[row.cycle].toLowerCase()}
        </span>
      ),
    },
    {
      key: "monthly",
      header: "Por mês",
      className: "whitespace-nowrap",
      sortValue: (row) => row.monthly,
      cell: (row) => (
        <span className="tabular-nums">{row.monthly > 0 ? money(row.monthly) : "—"}</span>
      ),
    },
    {
      key: "payer",
      header: "Quem paga",
      sortValue: (row) => row.payer,
      cell: (row) => (
        <Badge variant={row.payer === "me" ? "default" : "muted"}>{PAYER_LABEL[row.payer]}</Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatRow>
        <StatTile
          label="Custo no período"
          value={summary.totalPeriodo}
          format={money}
          hint={`${months.length} ${months.length === 1 ? "mês" : "meses"}`}
          delay={0}
        />
        <StatTile
          label="Você paga"
          value={summary.eu}
          format={money}
          tone={summary.eu > 0 ? "warning" : "default"}
          delay={60}
        />
        <StatTile label="Cliente paga" value={summary.cliente} format={money} delay={120} />
        <StatTile
          label="Custo mensal atual"
          value={summary.runRate}
          format={money}
          hint="Recorrente do último mês do período"
          delay={180}
        />
        <StatTile
          label="Ferramentas pagas"
          value={summary.pagas}
          format={(value) => String(Math.round(value))}
          hint={
            summary.maisCara
              ? `${summary.gratis} grátis · maior: ${summary.maisCara.name}`
              : `${summary.gratis} grátis`
          }
          delay={240}
        />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Custo por ferramenta"
          hint="Normalizado por mês: um plano anual entra como 1/12"
          delay={300}
          className="xl:col-span-2"
        >
          {byTool.length === 0 ? (
            <NoData>Nenhuma ferramenta paga em {currency} nesse período.</NoData>
          ) : (
            <ChartContainer
              config={payerConfig}
              className="aspect-auto w-full"
              style={{ height: Math.max(200, byTool.length * 40 + 40) }}
            >
              <BarChart data={byTool} layout="vertical" margin={{ left: 4, right: 84 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} {...axisProps} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload.name}
                      formatter={(value, name, item) => (
                        <>
                          <span className="text-muted-foreground">
                            {payerConfig[name as keyof typeof payerConfig]?.label}
                          </span>
                          <span className="ml-auto font-medium tabular-nums">
                            {money(Number(value))}
                          </span>
                          <span className="basis-full text-muted-foreground">
                            {item?.payload.projetos.join(", ")}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {/* AWS costs ~7000x what Resend does, so on a linear scale most
                    rows collapse to nothing. `minPointSize` keeps every tool at
                    2px — enough to see it exists and, more importantly, enough
                    for the total label to anchor in the right place even when
                    one side of the split is zero. */}
                {(["eu", "cliente"] as const).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="payer"
                    fill={`var(--color-${key})`}
                    radius={[0, 4, 4, 0]}
                    minPointSize={2}
                    {...surfaceGap}
                    {...motion(index)}
                  >
                    {key === "cliente" && (
                      <LabelList
                        dataKey="total"
                        position="right"
                        className="fill-muted-foreground tabular-nums"
                        fontSize={12}
                        formatter={(value) => formatCompactCurrency(Number(value), currency)}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Custo por categoria" hint="Onde o dinheiro está indo" delay={360}>
          {byCategory.length === 0 ? (
            <NoData />
          ) : (
            <ul className="flex flex-col gap-3">
              {byCategory.map((category, index) => {
                const share = category.total / summary.totalPeriodo;
                return (
                  <li key={category.key}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ background: `var(--chart-${category.slot})` }}
                        />
                        <span className="truncate">{category.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">{money(category.total)}</span>
                    </div>
                    {/* meter, not a chart: one ratio against a total */}
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{
                          width: `${Math.max(1, share * 100)}%`,
                          background: `var(--chart-${category.slot})`,
                          transitionDelay: `${index * 90}ms`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Custo mensal ao longo do tempo"
        hint="Sobe quando um projeto começa, cai quando ele acaba"
        delay={420}
      >
        <ChartContainer config={payerConfig} className="aspect-auto h-[240px] w-full">
          <AreaChart data={byMonth} margin={{ left: 4, right: 4, top: 4 }}>
            <defs>
              {(["eu", "cliente"] as const).map((key) => (
                <linearGradient key={key} id={`cost-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} />
            <YAxis
              width={64}
              tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
              {...axisProps}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => formatMonthLong(payload?.[0]?.payload.month)}
                  formatter={(value, name) => (
                    <>
                      <span className="text-muted-foreground">
                        {payerConfig[name as keyof typeof payerConfig]?.label}
                      </span>
                      <span className="ml-auto font-medium tabular-nums">
                        {money(Number(value))}
                      </span>
                    </>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {(["eu", "cliente"] as const).map((key, index) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                stackId="cost"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                fill={`url(#cost-${key})`}
                dot={false}
                activeDot={{ r: 4 }}
                {...motion(index)}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Todas as ferramentas pagas"
        hint="Em qual projeto, em qual conta e quem banca"
        delay={480}
      >
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          initialSort={{ key: "monthly", direction: "desc" }}
          emptyMessage={`Nenhuma ferramenta paga em ${currency} nos projetos filtrados.`}
        />
      </ChartCard>
    </div>
  );
}
