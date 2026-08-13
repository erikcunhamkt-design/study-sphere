import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";

import { PageHeader } from "@/components/layout/page-shell";
import { RecordacaoAtivaHub } from "@/features/study-sessions/recordacao-ativa-hub";

export const Route = createFileRoute("/app/revisar")({
  component: RevisarPage,
});

function RevisarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisar"
        description="Foque no Active Recall e recupere o que você aprendeu."
      />
      
      <RecordacaoAtivaHub 
        onBack={() => window.history.back()} 
      />
    </div>
  );
}
