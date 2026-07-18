import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/planejamento")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento"
        description="Organize tarefas, prazos, metas e sessões de estudo."
      />
      <EmptyState
        icon={<Target className="h-5 w-5" aria-hidden />}
        title="Sem tarefas ou metas"
        description="O planejador semanal e o calendário serão liberados em uma fase futura."
      />
    </div>
  ),
});
