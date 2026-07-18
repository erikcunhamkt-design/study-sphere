import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/estudar")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Estudar"
        description="Escolha um conteúdo e utilize o método de estudo mais adequado."
      />
      <EmptyState
        icon={<Play className="h-5 w-5" aria-hidden />}
        title="Nada para estudar agora"
        description="Assim que você cadastrar cursos e materiais, poderá iniciar sessões de estudo aqui."
      />
    </div>
  ),
});
