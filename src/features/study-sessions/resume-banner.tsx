import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDeleteStudySession, useInProgressStudySessions } from "./hooks";
import { STUDY_METHOD_LABELS } from "./labels";
import type { StudySessionRow } from "./types";

/**
 * Sessões com ended_at NULL sobrevivem a um fechamento de aba no meio do
 * método (achado do Gate 2) — sem isso, cada abandono vira lixo invisível
 * e inacessível. Mostrado só na visão de hub, nunca durante uma sessão
 * ativa.
 */
export function ResumeBanner({ onResume }: { onResume: (session: StudySessionRow) => void }) {
  const { data: sessions } = useInProgressStudySessions();
  const deleteSession = useDeleteStudySession();

  if (!sessions || sessions.length === 0) return null;

  async function handleDiscard(id: string) {
    try {
      await deleteSession.mutateAsync(id);
      toast.success("Sessão descartada");
    } catch (err) {
      console.error("[study-sessions] falha ao descartar sessão órfã", err);
      toast.error("Não foi possível descartar a sessão");
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
        {sessions.length === 1
          ? "Você tem 1 sessão não finalizada"
          : `Você tem ${sessions.length} sessões não finalizadas`}
      </div>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-2.5"
          >
            <p className="text-sm text-foreground">
              {STUDY_METHOD_LABELS[s.method]} · iniciada em{" "}
              {new Date(s.started_at).toLocaleString("pt-BR")}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={() => onResume(s)}>
                Retomar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={deleteSession.isPending}
                onClick={() => void handleDiscard(s.id)}
              >
                Descartar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
