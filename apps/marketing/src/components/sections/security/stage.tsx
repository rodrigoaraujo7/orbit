import type { CSSProperties, ReactElement } from "react"
import type { SecurityKey } from "./cycle"

const SVG =
  "absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] overflow-visible md:inset-3 md:h-[calc(100%-1.5rem)] md:w-[calc(100%-1.5rem)]"

function wait(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` }
}

const RECORD_WIDTH = 142

function Record({
  x,
  y,
  delay,
  locked = false,
}: {
  x: number
  y: number
  delay: number
  locked?: boolean
}) {
  const lockX = x + RECORD_WIDTH - 32
  return (
    <g
      data-part={locked ? "locked-row" : "account-row"}
      style={wait(delay)}
      className="security-motion security-in"
    >
      <rect
        x={x}
        y={y}
        width={RECORD_WIDTH}
        height={58}
        rx={16}
        className={
          locked
            ? "fill-foreground/[0.03] stroke-foreground/15"
            : "fill-primary/10 stroke-primary/45"
        }
      />
      <rect x={x + 16} y={y + 16} width={72} height={6} rx={3} className="fill-foreground/30" />
      <rect x={x + 16} y={y + 32} width={48} height={5} rx={2.5} className="fill-foreground/10" />
      {locked ? (
        <g className="stroke-foreground/35" strokeWidth={1.4} fill="none">
          <rect x={lockX} y={y + 24} width={14} height={11} rx={2} />
          <path d={`M${lockX + 3} ${y + 24} v-3 a4 4 0 0 1 8 0 v3`} />
        </g>
      ) : (
        <circle cx={x + RECORD_WIDTH - 22} cy={y + 29} r={4} className="fill-primary" />
      )}
    </g>
  )
}

function IsolationScene() {
  return (
    <svg viewBox="0 0 560 460" fill="none" strokeWidth={1.25} className={SVG} aria-hidden>
      <defs>
        <clipPath id="security-you-clip">
          <rect x="4" y="28" width="170" height="404" rx="32" />
        </clipPath>
      </defs>
      <rect
        data-part="phone"
        data-side="you"
        x="4"
        y="28"
        width="170"
        height="404"
        rx="32"
        className="fill-foreground/[0.03] stroke-foreground/15"
      />
      <rect
        data-part="phone"
        data-side="other"
        x="386"
        y="28"
        width="170"
        height="404"
        rx="32"
        className="fill-foreground/[0.02] stroke-foreground/10"
      />
      <g>
        <circle cx="36" cy="68" r="12" className="fill-primary/15 stroke-primary" />
        <circle cx="36" cy="65" r="4" className="fill-primary" />
        <path d="M28 76c2-4 14-4 16 0" className="stroke-primary" strokeLinecap="round" />
        <rect x="56" y="60" width="68" height="7" rx="3.5" className="fill-foreground/35" />
        <rect x="56" y="74" width="44" height="5" rx="2.5" className="fill-foreground/15" />
      </g>
      <g className="opacity-45">
        <circle cx="418" cy="68" r="12" className="stroke-foreground/30" />
        <rect x="438" y="60" width="68" height="7" rx="3.5" className="fill-foreground/20" />
        <rect x="438" y="74" width="44" height="5" rx="2.5" className="fill-foreground/10" />
      </g>
      <Record x={18} y={112} delay={80} />
      <Record x={18} y={186} delay={180} />
      <Record x={18} y={260} delay={280} />
      <Record x={400} y={112} delay={120} locked />
      <Record x={400} y={186} delay={220} locked />
      <Record x={400} y={260} delay={320} locked />
      <g clipPath="url(#security-you-clip)">
        <g className="security-motion security-scan">
          <rect x="16" y="100" width="146" height="46" className="fill-primary/10" />
          <rect x="16" y="144" width="146" height="2" className="fill-primary" />
        </g>
      </g>
      <path
        data-part="shield"
        d="M280 168l46 18v54c0 38-46 66-46 66s-46-28-46-66v-54l46-18z"
        className="security-motion security-in fill-primary/15 stroke-primary"
        strokeWidth={1.6}
        style={wait(200)}
      />
      <path
        d="M264 228l12 12 22-26"
        className="stroke-primary"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="338"
        y1="230"
        x2="370"
        y2="230"
        strokeDasharray="3 5"
        className="stroke-foreground/25"
      />
      <line
        x1="186"
        y1="230"
        x2="220"
        y2="230"
        className="stroke-primary/50"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EncryptionScene() {
  return (
    <svg viewBox="0 0 560 460" fill="none" strokeWidth={1.25} className={SVG} aria-hidden>
      <circle
        cx="280"
        cy="196"
        r="156"
        strokeDasharray="3 10"
        className="security-motion security-orbit stroke-foreground/15"
      />
      <circle
        cx="280"
        cy="196"
        r="124"
        className="security-motion security-orbit stroke-primary/25 [animation-direction:reverse]"
        strokeDasharray="2 12"
      />
      <rect
        x="168"
        y="124"
        width="224"
        height="156"
        rx="22"
        className="fill-card stroke-foreground/15"
      />
      <path d="M168 156l112 58 112-58" className="stroke-foreground/20" strokeLinejoin="round" />
      <g data-part="chip" className="security-motion security-chip">
        <rect
          x="206"
          y="176"
          width="148"
          height="72"
          rx="16"
          className="fill-primary/10 stroke-primary/50"
        />
        <circle cx="232" cy="212" r="10" className="stroke-primary" />
        <path d="M232 206v6M229 209h6" className="stroke-primary" strokeLinecap="round" />
        <rect x="252" y="198" width="78" height="6" rx="3" className="fill-primary/80" />
        <rect x="252" y="212" width="56" height="5" rx="2.5" className="fill-primary/35" />
        <rect x="252" y="226" width="40" height="5" rx="2.5" className="fill-foreground/20" />
      </g>
      <g data-part="stamp" className="security-motion security-stamp">
        <circle cx="360" cy="150" r="22" className="fill-primary stroke-primary-foreground/20" />
        <path
          d="M350 150l7 7 14-16"
          className="stroke-primary-foreground"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <line x1="280" y1="280" x2="280" y2="332" className="stroke-primary/40" />
      <circle cx="280" cy="332" r="4" className="fill-primary" />
      <rect
        x="150"
        y="332"
        width="260"
        height="78"
        rx="20"
        className="fill-foreground/[0.03] stroke-foreground/15"
      />
      <rect x="174" y="356" width="92" height="8" rx="4" className="fill-foreground/30" />
      <rect x="174" y="374" width="140" height="6" rx="3" className="fill-foreground/10" />
      <rect
        x="348"
        y="358"
        width="38"
        height="26"
        rx="8"
        className="fill-primary/15 stroke-primary/40"
      />
    </svg>
  )
}

const CODE_CELLS = [0, 1, 2, 3, 4, 5] as const

function EmailScene() {
  return (
    <svg viewBox="0 0 560 460" fill="none" strokeWidth={1.25} className={SVG} aria-hidden>
      <rect
        x="48"
        y="46"
        width="464"
        height="368"
        rx="32"
        className="fill-foreground/[0.03] stroke-foreground/15"
      />
      <rect x="78" y="78" width="168" height="10" rx="5" className="fill-foreground/25" />
      <rect x="78" y="98" width="96" height="7" rx="3.5" className="fill-foreground/10" />
      <g>
        {Array.from({ length: 10 }, (_, index) => (
          <circle key={index} cx={108 + index * 36} cy={156} r={5} className="fill-foreground/25" />
        ))}
      </g>
      <line x1="78" y1="186" x2="482" y2="186" className="stroke-foreground/10" />
      <g data-part="mail">
        <rect
          x="78"
          y="214"
          width="64"
          height="44"
          rx="12"
          className="fill-primary/10 stroke-primary/50"
        />
        <path d="M86 226l24 16 24-16" className="stroke-primary" strokeLinejoin="round" />
      </g>
      <path
        data-part="mail-path"
        d="M142 236 H168"
        pathLength={1}
        className="security-motion security-draw stroke-primary"
        strokeLinecap="round"
      />
      {CODE_CELLS.map((index) => {
        const x = 78 + index * 68
        return (
          <g key={index} data-part="digit">
            <rect
              x={x}
              y={286}
              width={56}
              height={72}
              rx={16}
              className="fill-card stroke-foreground/15"
            />
            <rect
              x={x + 14}
              y={316}
              width={28}
              height={8}
              rx={4}
              style={wait(180 + index * 140)}
              className="security-motion security-bar fill-primary"
            />
          </g>
        )
      })}
    </svg>
  )
}

const SCENES = {
  isolation: IsolationScene,
  encryption: EncryptionScene,
  emailCode: EmailScene,
} satisfies Record<SecurityKey, () => ReactElement>

export function SecurityStage({ kind }: { kind: SecurityKey }) {
  const Scene = SCENES[kind]
  return (
    <div
      key={kind}
      data-scene={kind}
      className="security-stage relative h-full min-h-0 w-full flex-1"
    >
      <Scene />
    </div>
  )
}
