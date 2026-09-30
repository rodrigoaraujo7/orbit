import type { CSSProperties } from "react"
import { cn } from "ui/utils"

const SVG = "absolute inset-0 h-full w-full overflow-visible"
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]"
const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]"
const DRAW =
  "[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] group-data-active:[stroke-dashoffset:0]"

function delay(ms: number): CSSProperties {
  return { transitionDelay: `${ms}ms` }
}

/** Rounded to keep server and client markup identical across JS engines. */
function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180
  return {
    x: Number((cx + radius * Math.cos(radians)).toFixed(2)),
    y: Number((cy + radius * Math.sin(radians)).toFixed(2)),
  }
}

function MiniCard({ x, y, dot }: { x: number; y: number; dot: string }) {
  return (
    <g>
      <rect x={x} y={y} width={96} height={36} rx={9} className="fill-card stroke-foreground/15" />
      <rect x={x + 12} y={y + 11} width={44} height={4} rx={2} className="fill-foreground/25" />
      <rect x={x + 12} y={y + 21} width={28} height={4} rx={2} className="fill-foreground/10" />
      <circle cx={x + 82} cy={y + 18} r={3} className={dot} />
    </g>
  )
}

const KANBAN_COLUMNS = [
  { x: 40, dot: "fill-muted-foreground" },
  { x: 180, dot: "fill-primary" },
  { x: 320, dot: "fill-success" },
] as const

export function KanbanArt() {
  return (
    <svg viewBox="0 0 480 220" fill="none" strokeWidth={1.25} className={SVG}>
      {KANBAN_COLUMNS.map(({ x, dot }, column) => (
        <g key={x}>
          <rect
            x={x}
            y={20}
            width={120}
            height={180}
            rx={16}
            className={cn(
              "fill-foreground/[0.02] stroke-foreground/15 transition-[stroke] duration-500",
              column === 1 && "group-data-active:stroke-primary/50",
            )}
          />
          <circle cx={x + 18} cy={40} r={3} className={dot} />
          <rect x={x + 28} y={37} width={36} height={6} rx={3} className="fill-foreground/20" />
        </g>
      ))}
      <MiniCard x={52} y={58} dot="fill-muted-foreground/60" />
      <MiniCard x={52} y={100} dot="fill-muted-foreground/60" />
      <MiniCard x={192} y={58} dot="fill-primary/70" />
      <rect
        x={192}
        y={100}
        width={96}
        height={36}
        rx={9}
        className="stroke-foreground/20 [stroke-dasharray:4_4] opacity-60 transition-opacity duration-300 group-data-active:opacity-0"
      />
      <MiniCard x={332} y={58} dot="fill-success" />
      <MiniCard x={332} y={100} dot="fill-success" />
      <MiniCard x={332} y={142} dot="fill-success" />
      <g
        data-part="moving-card"
        className={cn(
          "transition-[translate] duration-700 group-data-active:translate-x-[140px] group-data-active:-translate-y-[42px]",
          SPRING,
        )}
      >
        <rect
          x={52}
          y={142}
          width={96}
          height={36}
          rx={9}
          className="fill-primary/15 stroke-primary"
        />
        <rect x={64} y={153} width={44} height={4} rx={2} className="fill-primary" />
        <rect x={64} y={163} width={28} height={4} rx={2} className="fill-primary/40" />
        <circle cx={134} cy={160} r={3} className="fill-primary" />
      </g>
    </svg>
  )
}

const DIAL_TICKS = Array.from({ length: 36 }, (_, i) => i * 10)
const PASSWORD_DOTS = Array.from({ length: 8 }, (_, i) => i)

export function SecretsArt() {
  return (
    <svg viewBox="0 0 240 300" fill="none" strokeWidth={1.25} className={SVG}>
      <circle
        cx={120}
        cy={120}
        r={96}
        className={cn(
          "origin-center stroke-foreground/15 [stroke-dasharray:2_7] transition-[rotate] duration-[1400ms] transform-fill group-data-active:rotate-90",
          EASE,
        )}
      />
      <g
        data-part="dial"
        className={cn(
          "origin-center transition-[rotate] duration-1000 transform-fill group-data-active:-rotate-[60deg]",
          EASE,
        )}
      >
        {DIAL_TICKS.map((degrees) => {
          const major = degrees % 90 === 0
          const from = polar(120, 120, major ? 66 : 70, degrees)
          const to = polar(120, 120, 78, degrees)
          return (
            <line
              key={degrees}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeLinecap="round"
              className={major ? "stroke-primary/70" : "stroke-foreground/20"}
            />
          )
        })}
      </g>
      <circle
        cx={120}
        cy={120}
        r={56}
        className="fill-card stroke-foreground/15 transition-[stroke] duration-500 group-data-active:stroke-primary/40"
      />
      <path
        data-part="shackle"
        d="M104 118 V104 a16 16 0 0 1 32 0 V118"
        strokeWidth={3}
        strokeLinecap="round"
        className={cn(
          "-translate-y-2 stroke-foreground/40 transition-[translate,stroke] duration-500 group-data-active:translate-y-0 group-data-active:stroke-primary",
          SPRING,
        )}
      />
      <rect
        x={96}
        y={114}
        width={48}
        height={38}
        rx={9}
        strokeWidth={1.5}
        className="fill-card stroke-foreground/40 transition-[fill,stroke] duration-500 group-data-active:fill-primary/15 group-data-active:stroke-primary"
      />
      <g className="fill-foreground/40 transition-[fill] duration-500 group-data-active:fill-primary">
        <circle cx={120} cy={129} r={4} />
        <rect x={118.5} y={131} width={3} height={10} rx={1.5} />
      </g>
      <rect
        x={44}
        y={238}
        width={152}
        height={36}
        rx={18}
        className="stroke-foreground/15 transition-[stroke] duration-500 group-data-active:stroke-primary/40"
      />
      {PASSWORD_DOTS.map((i) => (
        <circle
          key={i}
          data-part="password-dot"
          cx={64 + i * 16}
          cy={256}
          r={4}
          style={delay(i * 60)}
          className="fill-foreground/15 transition-[fill] duration-300 group-data-active:fill-primary"
        />
      ))}
    </svg>
  )
}

type Month = "paid" | "overdue" | "pending" | "future"

const MONTHS: readonly Month[] = [
  "paid",
  "paid",
  "paid",
  "paid",
  "paid",
  "paid",
  "overdue",
  "pending",
  "pending",
  "future",
  "future",
  "future",
]

const MONTH_FILL: Record<Month, string> = {
  paid: "fill-chart-1",
  overdue: "fill-chart-3",
  pending: "fill-chart-2/20 stroke-chart-2 [stroke-dasharray:3_3]",
  future: "hidden",
}

export function InvoicesArt() {
  return (
    <svg viewBox="0 0 320 200" fill="none" strokeWidth={1.25} className={SVG}>
      <line x1={24} y1={148} x2={312} y2={148} className="stroke-foreground/15" />
      {MONTHS.map((status, i) => {
        const x = 28 + i * 24
        return (
          <g key={i}>
            <line x1={x + 8} y1={148} x2={x + 8} y2={154} className="stroke-foreground/20" />
            <rect
              x={x}
              y={80}
              width={16}
              height={56}
              rx={6}
              className="fill-foreground/[0.03] stroke-foreground/15"
            />
            <rect
              x={x}
              y={80}
              width={16}
              height={56}
              rx={6}
              data-part="month"
              data-status={status}
              style={delay(i * 45)}
              className={cn(
                "origin-bottom scale-y-[0.3] opacity-0 transition-[scale,opacity] duration-500 transform-fill group-data-active:scale-y-100 group-data-active:opacity-100",
                EASE,
                MONTH_FILL[status],
              )}
            />
          </g>
        )
      })}
      <g
        data-part="today"
        className={cn(
          "transition-[translate] duration-1000 group-data-active:translate-x-[192px]",
          EASE,
        )}
      >
        <line x1={36} y1={62} x2={36} y2={148} className="stroke-primary" />
        <path d="M30 52 h12 l-6 8 z" className="fill-primary" />
      </g>
    </svg>
  )
}

const PIPELINE = [
  { d: "M60 100 C96 100 96 58 124 58", wait: 100 },
  { d: "M60 100 C96 100 96 142 124 142", wait: 100 },
  { d: "M148 58 C184 58 184 100 212 100", wait: 450 },
  { d: "M148 142 C184 142 184 100 212 100", wait: 450 },
  { d: "M236 100 H260", wait: 800 },
] as const

const JOBS = [
  { cx: 48, cy: 100, wait: 0 },
  { cx: 136, cy: 58, wait: 350 },
  { cx: 136, cy: 142, wait: 350 },
  { cx: 224, cy: 100, wait: 700 },
] as const

export function GithubArt() {
  return (
    <svg viewBox="0 0 320 200" fill="none" strokeWidth={1.5} className={SVG}>
      {PIPELINE.map(({ d, wait }) => (
        <g key={d}>
          <path d={d} className="stroke-foreground/15" />
          <path
            d={d}
            pathLength={1}
            data-part="edge"
            style={delay(wait)}
            className={cn("stroke-success duration-500", DRAW, EASE)}
          />
        </g>
      ))}
      {JOBS.map(({ cx, cy, wait }) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={12} className="fill-card stroke-foreground/25" />
          <circle
            cx={cx}
            cy={cy}
            r={4.5}
            data-part="job"
            style={delay(wait)}
            className={cn(
              "origin-center scale-0 fill-success transition-[scale] duration-500 transform-fill group-data-active:scale-100",
              SPRING,
            )}
          />
        </g>
      ))}
      <circle cx={272} cy={100} r={12} className="fill-card stroke-foreground/25" />
      <circle
        cx={272}
        cy={100}
        r={12}
        strokeWidth={2}
        data-part="running"
        style={delay(1050)}
        className="origin-center animate-[spin_2.4s_linear_infinite] stroke-warning opacity-0 [stroke-dasharray:6_6] transition-opacity duration-300 transform-fill group-data-active:opacity-100"
      />
    </svg>
  )
}

const REVENUE = [58, 52, 70, 64, 88, 76, 104, 96, 126] as const
const BASELINE = 176

export function FinanceArt() {
  const points = REVENUE.map((height, i) => `${52 + i * 48},${BASELINE - height - 16}`).join(" ")
  return (
    <svg viewBox="0 0 480 200" fill="none" strokeWidth={1.25} className={SVG}>
      {[40, 80, 120, 160].map((y) => (
        <line
          key={y}
          x1={24}
          y1={y}
          x2={456}
          y2={y}
          className="stroke-foreground/10 [stroke-dasharray:2_6]"
        />
      ))}
      {REVENUE.map((height, i) => (
        <g key={i}>
          <rect
            x={40 + i * 48}
            y={BASELINE - height}
            width={24}
            height={height}
            rx={6}
            className="fill-foreground/[0.07]"
          />
          <rect
            x={40 + i * 48}
            y={BASELINE - height}
            width={24}
            height={height}
            rx={6}
            data-part="bar"
            style={delay(i * 50)}
            className={cn(
              "origin-bottom scale-y-0 fill-primary/80 transition-[scale] duration-700 transform-fill group-data-active:scale-y-100",
              EASE,
            )}
          />
        </g>
      ))}
      <polyline points={points} strokeLinejoin="round" className="stroke-foreground/20" />
      <polyline
        points={points}
        pathLength={1}
        strokeWidth={2}
        strokeLinejoin="round"
        data-part="trend"
        style={delay(200)}
        className={cn("stroke-chart-2 duration-[1200ms]", DRAW, EASE)}
      />
      <line
        x1={240}
        y1={16}
        x2={240}
        y2={BASELINE}
        data-part="crosshair"
        style={{ translate: "calc(var(--px, 0) * 216px) 0" }}
        className="stroke-foreground/40 opacity-0 [stroke-dasharray:3_3] transition-[translate,opacity] duration-150 ease-out group-data-active:opacity-100"
      />
    </svg>
  )
}

const LOG_ROWS = [64, 98, 132, 166] as const

function LogRow({ y, dot, line }: { y: number; dot: string; line: string }) {
  return (
    <>
      <circle cx={58} cy={y + 12} r={4} className={dot} />
      <rect x={72} y={y + 10} width={90} height={4} rx={2} className={line} />
      <rect x={178} y={y + 10} width={48} height={4} rx={2} className="fill-foreground/10" />
      <rect x={250} y={y + 10} width={20} height={4} rx={2} className="fill-foreground/10" />
    </>
  )
}

export function AuditArt() {
  return (
    <svg viewBox="0 0 320 200" fill="none" strokeWidth={1.25} className={SVG}>
      <line x1={26} y1={28} x2={26} y2={192} className="stroke-foreground/10" />
      <g
        data-part="new-entry"
        className={cn(
          "-translate-y-3 opacity-0 transition-[translate,opacity] duration-500 group-data-active:translate-y-0 group-data-active:opacity-100",
          SPRING,
        )}
      >
        <circle cx={26} cy={42} r={3} className="fill-primary" />
        <rect
          x={40}
          y={30}
          width={240}
          height={24}
          rx={8}
          className="fill-primary/10 stroke-primary/60"
        />
        <LogRow y={30} dot="fill-primary" line="fill-primary/70" />
      </g>
      {LOG_ROWS.map((y, i) => (
        <g
          key={y}
          data-part="entry"
          style={delay(80 + i * 40)}
          className={cn(
            "transition-[opacity,translate] duration-500",
            i === LOG_ROWS.length - 1
              ? "group-data-active:translate-y-2 group-data-active:opacity-0"
              : "group-data-active:opacity-60",
            EASE,
          )}
        >
          <circle cx={26} cy={y + 12} r={2.5} className="fill-foreground/25" />
          <rect
            x={40}
            y={y}
            width={240}
            height={24}
            rx={8}
            className="fill-foreground/[0.02] stroke-foreground/15"
          />
          <LogRow y={y} dot="fill-foreground/30" line="fill-foreground/25" />
        </g>
      ))}
    </svg>
  )
}
