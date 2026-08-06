import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-shell";

export const Route = createFileRoute("/app/desempenho")({
  component: () => (
    <div className="space-y-6">
      <PageHeader
        title="Desempenho"
        description="Acompanhe tempo estudado, acertos, retenção e evolução."
      />
      <EmptyState
        icon={<LineChart className="h-5 w-5" aria-hidden />}
        title="Sem dados suficientes"
        description="As métricas serão calculadas a partir das suas sessões, revisões e respostas."
      />
    </div>
  ),
});
