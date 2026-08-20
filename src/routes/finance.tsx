import { createFileRoute } from "@tanstack/react-router";

import { FinanceCalendar } from "@/components/finance/finance-calendar";
import { FinanceEventsTable } from "@/components/finance/finance-events-table";
import { PageHeader } from "@/components/layout/page";
import { financeEvents } from "@/lib/finance-events";
import { useProjects } from "@/lib/projects-store";
import { useRegistry } from "@/lib/registry-store";

function FinancePage() {
  const { projects } = useProjects();
  const { findContact } = useRegistry();

  const events = financeEvents(
    projects,
    (clientId) => findContact(clientId)?.name ?? "—"
  );

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Cobranças, pagamentos pendentes e custos de ferramentas."
      />

      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <FinanceCalendar events={events} />
        <FinanceEventsTable events={events} />
      </div>
    </>
  );
}

export const Route = createFileRoute("/finance")({
  component: FinancePage,
});
