import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/flashcards")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Flashcards"
        description="Crie cartões, revise conteúdos e acompanhe sua retenção."
      />
      <EmptyState
        icon={<Layers className="h-5 w-5" aria-hidden />}
        title="Sem baralhos criados"
        description="A criação e o estudo de flashcards com revisão espaçada virão em uma fase futura."
      />
    </div>
  ),
});
