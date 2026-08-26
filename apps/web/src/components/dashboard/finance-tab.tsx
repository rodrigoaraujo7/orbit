import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, NoData, StatRow, StatTile } from "@/components/dashboard/cards";
import { axisProps, surfaceGap, useChartMotion } from "@/components/dashboard/chart-parts";
import { PaymentRuler } from "@/components/dashboard/payment-ruler";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Project } from "@/data/projects";
import {
  clientGrowth,
  financeSummary,
  profitByProject,
  revenueByMonth,
} from "@/lib/dashboard-metrics";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonth,
  formatMonthLong,
  formatPercent,
} from "@/lib/format";

/**
 * Three states of the same money, so the three chart slots are picked as a set
 * rather than borrowed from the status tokens: `--destructive` sits at the same
 * hue as the brand bordô and the pair measures ΔE 10.0 (light) / 12.3 (dark)
 * under normal vision — below the 15 floor, so "recebido" and "atrasado" would
 * blur into each other whenever a month has no pending slice between them.
 * Slots 1/2/3 clear every pair against the dark surface. The status red stays where it
 * belongs, on the invoice badges; here every series carries its own label.
 */
const revenueConfig = {
  recebido: { label: "Recebido", color: "var(--chart-1)" },
  aReceber: { label: "A receber", color: "var(--chart-2)" },
  atrasado: { label: "Atrasado", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Nominal bars ordered by value: one hue, because the bar length already
// encodes the magnitude — coloring by rank would spend the identity channel
// re-saying it.
const profitConfig = {
  lucro: { label: "Lucro", color: "var(--chart-1)" },
} satisfies ChartConfig;

const clientsConfig = {
  clientes: { label: "Clientes", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function FinanceTab({
  projects,
  months,
  currency,
}: {
  projects: Project[];
  months: string[];
  currency: string;
}) {
  const motion = useChartMotion();
  const summary = financeSummary(projects, months, currency);
  const revenue = revenueByMonth(projects, months, currency);
  const profits = profitByProject(projects, months, currency).filter(
    (project) => project.receita > 0 || project.custo > 0,
  );
  const growth = clientGrowth(projects, months);

  const money = (value: number) => formatCurrency(value, currency);
  const hasRevenue = revenue.some((month) => month.recebido + month.aReceber + month.atrasado > 0);

  return (
    <div className="flex flex-col gap-4">
      <StatRow>
        <StatTile label="Faturado no período" value={summary.faturado} format={money} delay={0} />
        <StatTile
          label="Recebido"
          value={summary.recebido}
          format={money}
          tone="success"
          delay={60}
        />
        <StatTile label="A receber" value={summary.aReceber} format={money} delay={120} />
        <StatTile
          label="Atrasado"
          value={summary.atrasado}
          format={money}
          tone={summary.atrasado > 0 ? "destructive" : "default"}
          delay={180}
        />
        <StatTile
          label="Custo de ferramentas"
          value={summary.custo}
          format={money}
          hint="Só o que sai do seu bolso"
          delay={240}
        />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Faturamento por mês"
          hint={`${summary.projetos} projetos · ${summary.clientes} clientes · margem de ${formatPercent(summary.margem)}`}
          delay={300}
          className="xl:col-span-2"
        >
          {hasRevenue ? (
            <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={revenue} margin={{ left: 4, right: 4, top: 4 }}>
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
                            {revenueConfig[name as keyof typeof revenueConfig]?.label}
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
                {(["recebido", "aReceber", "atrasado"] as const).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="revenue"
                    fill={`var(--color-${key})`}
                    radius={[4, 4, 0, 0]}
                    {...surfaceGap}
                    {...motion(index)}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          ) : (
            <NoData>Nenhuma fatura em {currency} nesse período.</NoData>
          )}
        </ChartCard>

        <ChartCard title="Crescimento de clientes" hint="Clientes acumulados" delay={360}>
          <ChartContainer config={clientsConfig} className="aspect-auto h-[260px] w-full">
            <AreaChart data={growth} margin={{ left: 4, right: 4, top: 4 }}>
              <defs>
                <linearGradient id="client-growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-clientes)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-clientes)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} />
              <YAxis width={28} allowDecimals={false} {...axisProps} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => formatMonthLong(payload?.[0]?.payload.month)}
                    formatter={(value, _name, item) => (
                      <>
                        <span className="text-muted-foreground">
                          {Number(value) === 1 ? "cliente" : "clientes"}
                        </span>
                        <span className="ml-auto font-medium tabular-nums">{Number(value)}</span>
                        {item?.payload.novos > 0 && (
                          <span className="text-muted-foreground">
                            (+{item.payload.novos} no mês)
                          </span>
                        )}
                      </>
                    )}
                  />
                }
              />
              <Area
                dataKey="clientes"
                type="monotone"
                stroke="var(--color-clientes)"
                strokeWidth={2}
                fill="url(#client-growth)"
                dot={false}
                activeDot={{ r: 4 }}
                {...motion()}
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Lucro por projeto"
        hint="Valor faturado menos as ferramentas que você paga"
        delay={420}
      >
        {profits.length === 0 ? (
          <NoData>Nenhum projeto em {currency} nesse período.</NoData>
        ) : (
          <ChartContainer
            config={profitConfig}
            className="aspect-auto w-full"
            style={{ height: Math.max(180, profits.length * 44) }}
          >
            <BarChart data={profits} layout="vertical" margin={{ left: 4, right: 84 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={150} {...axisProps} />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) => payload?.[0]?.payload.name}
                    formatter={(_value, _name, item) => (
                      <div className="grid gap-0.5 tabular-nums">
                        <span>Receita {money(item.payload.receita)}</span>
                        <span>Custo {money(item.payload.custo)}</span>
                        <span className="font-medium">
                          Lucro {money(item.payload.lucro)} · {formatPercent(item.payload.margem)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="lucro" fill="var(--color-lucro)" radius={[0, 4, 4, 0]} {...motion()}>
                <LabelList
                  dataKey="lucro"
                  position="right"
                  className="fill-muted-foreground tabular-nums"
                  fontSize={12}
                  formatter={(value) => formatCompactCurrency(Number(value), currency)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Régua de recebimento"
        hint="Cada parcela no mês em que vence, por projeto"
        delay={480}
      >
        <PaymentRuler projects={projects} months={months} currency={currency} />
      </ChartCard>
    </div>
  );
}
