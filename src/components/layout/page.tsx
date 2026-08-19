import { Construction } from "lucide-react";
import type { ReactNode } from "react";

import { Emphasis } from "@/components/ui/emphasis";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
        <h1 className="font-heading text-4xl font-normal tracking-normal sm:text-4xl">{title}</h1>
        {description && <p className="font-subtitle mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Placeholder for the sections that have not been designed yet. */
export function ComingSoon({ section }: { section: string }) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center gap-3 px-6 py-24 text-center duration-500">
      <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Construction className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">
        A seção <Emphasis className="text-foreground">{section}</Emphasis> ainda está em construção.
      </p>
    </div>
  );
}
