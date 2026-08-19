import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Destaca uma palavra/nome inline (ex: nome do item a excluir, nome da seção
 * ainda em construção): serif itálico por padrão. A cor/peso continuam a
 * critério de quem usa (className). Passe `italic={false}` quando o trecho
 * ao redor pedir a fonte regular (ex: a palavra "excluir" antes do nome) —
 * a Instrument Serif tem um traço inclinado mesmo no peso normal, então
 * "desligar" o itálico troca pra Instrument Sans em vez de só tirar a classe.
 */
export function Emphasis({ className, italic = true, ...props }: ComponentProps<"span"> & { italic?: boolean }) {
  return (
    <span
      className={cn("font-bold", italic ? "font-heading italic tracking-wider text-[1.15em]" : "font-subtitle", className)}
      {...props}
    />
  );
}
