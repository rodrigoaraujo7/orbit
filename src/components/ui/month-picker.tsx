import { Popover } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
);

/**
 * Substitui o `<input type="month">` nativo: o popup de calendário do
 * browser não dá pra estilizar (é UI do SO, fora do DOM), então aqui é um
 * botão + grid de meses do ano, no mesmo estilo do Select/Menu do app.
 * Valor no formato "YYYY-MM" (igual ao input nativo), string vazia = sem filtro.
 */
export function MonthPicker({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
}) {
  const [year, selectedMonth] = value ? value.split("-").map(Number) : [undefined, undefined];
  const [viewYear, setViewYear] = useState(() => year ?? new Date().getFullYear());

  const label = year && selectedMonth ? `${MONTHS[selectedMonth - 1]}/${year}` : placeholder;

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-[color,border-color,box-shadow]",
          "hover:bg-muted/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          !value && "text-muted-foreground",
        )}
      >
        <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
        {label}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-[60]">
          <Popover.Popup className="w-56 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Ano anterior"
                onClick={() => setViewYear((y) => y - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium">{viewYear}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Próximo ano"
                onClick={() => setViewYear((y) => y + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((month, i) => {
                const isSelected = year === viewYear && selectedMonth === i + 1;
                return (
                  <Popover.Close
                    key={month}
                    type="button"
                    onClick={() => onChange(`${viewYear}-${String(i + 1).padStart(2, "0")}`)}
                    className={cn(
                      "cursor-default rounded-lg px-2 py-1.5 text-center text-sm capitalize outline-none select-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    {month}
                  </Popover.Close>
                );
              })}
            </div>

            {value && (
              <Popover.Close
                type="button"
                onClick={() => onChange("")}
                className="mt-2 w-full cursor-default rounded-lg px-2 py-1.5 text-center text-sm text-muted-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground"
              >
                Limpar
              </Popover.Close>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
