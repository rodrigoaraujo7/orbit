import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatCurrency } from "@/lib/format";
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
 * Headline number in the page header — same type scale as the title and
 * description beside it, so the header reads as one balanced row.
 */
export function HeroFigure({
  value,
  currency,
  hint,
}: {
  value: number;
  currency: string;
  hint?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const animated = useCountUp(value, reduced);
  const enter = enterProps(0, reduced);

  return (
    <div {...enter} className={cn("mt-3 sm:mt-0 sm:text-right", enter.className)}>
      <p
        className={cn(
          "font-heading text-4xl font-normal tracking-normal tabular-nums sm:text-4xl",
          value < 0 && "text-destructive",
        )}
      >
        {formatCurrency(animated, currency)}
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
  icon,
  iconClassName,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  hint?: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  tone?: StatTone;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const animated = useCountUp(value, reduced);
  const enter = enterProps(delay, reduced);

  const valueClass = icon
    ? "font-subtitle text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl"
    : "mt-1 font-subtitle text-lg font-semibold tracking-tight tabular-nums sm:text-xl 2xl:text-2xl";

  const valueEl = (
    <p className={cn(valueClass, TONE_CLASS[tone])}>{format(animated)}</p>
  );
  const labelEl = (
    <p className={cn("font-subtitle text-xs text-muted-foreground", icon && "mt-0.5 leading-none")}>
      {label}
    </p>
  );
  const hintEl = hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null;

  return (
    <div {...enter} className={cn("rounded-xl border p-4", enter.className)}>
      {icon ? (
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5",
              iconClassName,
            )}
          >
            {icon}
          </span>
          <div className="min-w-0">
            {valueEl}
            {labelEl}
            {hintEl}
          </div>
        </div>
      ) : (
        <>
          {labelEl}
          {/* Sized against the tightest column, not the roomiest: a full
              "R$ 136.000,00" needs ~130px at 20px, and the tile is 127px wide on a
              375px phone and 150px in the 5-column row at 1280px. A currency value
              can't wrap, so the type steps instead. */}
          {valueEl}
          {hintEl}
        </>
      )}
    </div>
  );
}

/** Responsive row of tiles — the KPI strip at the top of each tab. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6 xl:grid-cols-5 max-lg:[&>:last-child]:col-span-2 lg:max-xl:[&>:nth-child(-n+3)]:col-span-2 lg:max-xl:[&>:nth-last-child(-n+2)]:col-span-3">
      {children}
    </div>
  );
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
export function NoData({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <p className="grid h-[220px] place-items-center text-center text-sm text-muted-foreground">
      {children ?? t("dashboard.noData")}
    </p>
  );
}
