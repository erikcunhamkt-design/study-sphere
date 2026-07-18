import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/biblioteca")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca"
        description="Centralize PDFs, links, vídeos, livros e outros materiais."
      />
      <EmptyState
        icon={<Library className="h-5 w-5" aria-hidden />}
        title="Biblioteca vazia"
        description="Upload e organização de materiais estarão disponíveis em uma fase futura."
      />
    </div>
  ),
});
