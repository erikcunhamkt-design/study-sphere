import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/questoes")({
  component: () => (
    <div className="space-y-6">
      <PageHeader title="Questões" description="Resolva questões, simulados e revise seus erros." />
      <EmptyState
        icon={<ListChecks className="h-5 w-5" aria-hidden />}
        title="Sem questões disponíveis"
        description="O banco de questões e os simulados serão implementados em uma fase futura."
      />
    </div>
  ),
});
