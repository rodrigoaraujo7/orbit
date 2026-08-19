import { useEffect, useState, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Same 700ms/ease-out feel the charts use, so tiles and bars land together. */
const COUNT_UP_MS = 700;

function useCountUp(target: number, disabled: boolean) {
  // Starts at zero and is only ever advanced from inside the animation frame —
  // when motion is off the target is returned directly, no state involved.
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (disabled) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      // easeOutCubic: quick off the line, soft landing on the final number
      setValue(target * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, disabled]);

  return disabled ? target : value;
}

/** Entrance animation shared by every block on the dashboard. */
function enterProps(delay: number, reduced: boolean) {
  return reduced
    ? {}
    : {
        style: { animationDelay: `${delay}ms` },
        className: "animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500",
      };
}

/**
 * The dashboard's headline number: Instrument Serif at display size, because
 * the serif is what this app looks like — a generic sans hero would be any
 * other dashboard's hero.
 */
export function HeroFigure({
  label,
  value,
  format,
  hint,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  hint?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const animated = useCountUp(value, reduced);
  const enter = enterProps(0, reduced);

  return (
    <div {...enter} className={cn("mt-3 sm:mt-0 sm:text-right", enter.className)}>
      <p className="font-subtitle text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "font-heading text-5xl leading-none font-normal tabular-nums",
          value < 0 && "text-destructive",
        )}
      >
        {format(animated)}
      </p>
      {hint && <p className="font-subtitle mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export type StatTone = "default" | "success" | "warning" | "destructive";

const TONE_CLASS: Record<StatTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

/**
 * One number with its label. Deliberately not a chart: a single current value
 * reads better as a tile than as a one-bar bar chart.
 */
export function StatTile({
  label,
  value,
  format,
  hint,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  hint?: ReactNode;
  tone?: StatTone;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const animated = useCountUp(value, reduced);
  const enter = enterProps(delay, reduced);

  return (
    <div {...enter} className={cn("rounded-xl border p-4", enter.className)}>
      <p className="font-subtitle text-xs text-muted-foreground">{label}</p>
      {/* Sized against the tightest column, not the roomiest: a full
          "R$ 136.000,00" needs ~130px at 20px, and the tile is 127px wide on a
          375px phone and 150px in the 5-column row at 1280px. A currency value
          can't wrap, so the type steps instead. */}
      <p
        className={cn(
          "mt-1 font-subtitle text-lg font-semibold tracking-tight tabular-nums sm:text-xl 2xl:text-2xl",
          TONE_CLASS[tone],
        )}
      >
        {format(animated)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Responsive row of tiles — the KPI strip at the top of each tab. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">{children}</div>;
}

/**
 * Container for a chart: same `rounded-xl border p-4` as the project detail
 * cards, so the dashboard does not read as a different product.
 */
export function ChartCard({
  title,
  hint,
  aside,
  delay = 0,
  className,
  children,
}: {
  title: string;
  hint?: ReactNode;
  aside?: ReactNode;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const enter = enterProps(delay, reduced);

  return (
    <section {...enter} className={cn("rounded-xl border p-4", className, enter.className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-subtitle text-sm font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Shown inside a card when the filters leave it with nothing to draw. */
export function NoData({ children = "Nada nesse período." }: { children?: ReactNode }) {
  return (
    <p className="grid h-[220px] place-items-center text-center text-sm text-muted-foreground">{children}</p>
  );
}
