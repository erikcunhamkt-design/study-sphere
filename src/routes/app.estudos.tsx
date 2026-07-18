import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/estudos")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Estudos"
        description="Organize áreas de conhecimento, cursos, módulos, aulas e anotações."
      />
      <EmptyState
        icon={<BookOpen className="h-5 w-5" aria-hidden />}
        title="Nenhuma área criada"
        description="A criação de áreas, cursos e anotações será liberada na próxima fase."
      />
    </div>
  ),
});
