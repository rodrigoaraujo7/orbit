import { Dialog } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Título padrão de modal/dialog: serif, sem peso extra, tracking mais aberto. */
export function DialogTitle({ className, ...props }: ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title className={cn("font-heading text-[26px] font-normal tracking-wide", className)} {...props} />;
}

/** Subtítulo/descrição padrão de modal/dialog, logo abaixo do DialogTitle. */
export function DialogDescription({ className, ...props }: ComponentProps<typeof Dialog.Description>) {
  return <Dialog.Description className={cn("font-subtitle mt-1.5 text-sm text-muted-foreground", className)} {...props} />;
}
