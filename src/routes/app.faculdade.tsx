import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/faculdade")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Faculdade"
        description="Centralize disciplinas, semestres, provas, trabalhos e materiais acadêmicos."
      />
      <EmptyState
        icon={<GraduationCap className="h-5 w-5" aria-hidden />}
        title="Sem disciplinas cadastradas"
        description="Você poderá cadastrar semestres, disciplinas e avaliações em uma fase futura."
      />
    </div>
  ),
});
