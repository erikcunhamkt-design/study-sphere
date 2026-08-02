import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useExamAttempts, useExams } from "./hooks";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

/**
 * Só tentativas finalizadas (ended_at preenchido) — o placar exibido é
 * exatamente o que finish_exam_attempt gravou, sem recálculo aqui.
 */
export function AttemptHistory() {
  const { data: attempts, isLoading: attemptsLoading } = useExamAttempts();
  const { data: exams } = useExams();

  const finished = (attempts ?? []).filter((a) => a.ended_at !== null);
  const examTitleById = new Map((exams ?? []).map((e) => [e.id, e.title]));

  if (attemptsLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (finished.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma tentativa finalizada ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {finished.map((attempt) => {
        const pct =
          attempt.score_total && attempt.score_total > 0
            ? Math.round(((attempt.score_correct ?? 0) / attempt.score_total) * 100)
            : null;
        return (
          <div
            key={attempt.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {attempt.exam_id
                  ? (examTitleById.get(attempt.exam_id) ?? "Simulado")
                  : "Simulado excluído"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(attempt.started_at).toLocaleString("pt-BR")} ·{" "}
                {formatDuration(attempt.duration_seconds)}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {attempt.score_correct}/{attempt.score_total}
              {pct !== null ? ` (${pct}%)` : ""}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
