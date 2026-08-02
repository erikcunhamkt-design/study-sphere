import { Link } from "@tanstack/react-router";
import { Layers, ListChecks } from "lucide-react";

/**
 * Recordação ativa não cria study_sessions própria — é um hub que aponta
 * para flashcards/questões, cuja atividade já é logada em
 * flashcard_reviews/question_attempts. Criar uma linha aqui também
 * contaria a mesma atividade duas vezes.
 */
export function RecordacaoAtivaHub({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <p className="text-sm text-muted-foreground">
        Recordação ativa é testar sua memória em vez de reler — revise seus flashcards devidos ou
        pratique questões do seu banco.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/app/flashcards"
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-medium text-foreground">Revisar flashcards</span>
        </Link>
        <Link
          to="/app/questoes"
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-medium text-foreground">Praticar questões</span>
        </Link>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        Voltar
      </button>
    </div>
  );
}
