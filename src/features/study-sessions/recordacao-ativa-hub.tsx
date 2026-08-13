import { useState } from "react";
import { Layers, ListChecks, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { ReviewSession } from "@/features/flashcards/review-session";
import { useExams, useStartExamAttempt } from "@/features/questions/hooks";
import { ExamAttemptRunner } from "@/features/questions/exam-attempt-runner";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinishExamAttemptResult } from "@/features/questions/types";

type View = "hub" | "flashcards" | "questions_list" | "exam_runner";

export function RecordacaoAtivaHub({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<View>("hub");
  const { data: dueFlashcards, isLoading: loadingFlashcards } = useDueFlashcards();
  const { data: exams, isLoading: loadingExams } = useExams();
  const startExam = useStartExamAttempt();
  const [activeAttempt, setActiveAttempt] = useState<{ exam: any; attempt: any } | null>(null);

  const handleStartExam = async (exam: any) => {
    try {
      const attempt = await startExam.mutateAsync(exam.id);
      setActiveAttempt({ exam, attempt });
      setView("exam_runner");
    } catch (error) {
      console.error("Erro ao iniciar simulado:", error);
    }
  };

  if (view === "flashcards_training" && deckAllFlashcards) {
    return (
      <ReviewSession 
        queue={deckAllFlashcards} 
        onFinish={() => onBack()} 
        isTrainingMode={true}
      />
    );
  }

  if (view === "flashcards" && dueFlashcards) {
    return (
      <ReviewSession 
        queue={dueFlashcards} 
        onFinish={() => setView("hub")} 
      />
    );
  }

  if (view === "exam_runner" && activeAttempt) {
    return (
      <ExamAttemptRunner
        exam={activeAttempt.exam}
        attempt={activeAttempt.attempt}
        onFinish={(result: FinishExamAttemptResult) => {
          setView("hub");
          setActiveAttempt(null);
        }}
        onExit={() => {
          setView("hub");
          setActiveAttempt(null);
        }}
      />
    );
  }

  if (view === "questions_list") {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("hub")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">Escolha um Simulado</h3>
        </div>
        
        {loadingExams ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !exams || exams.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum simulado encontrado. Crie um em Estudos para praticar aqui.
          </p>
        ) : (
          <div className="grid gap-2">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => handleStartExam(exam)}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40"
              >
                <div>
                  <p className="text-sm font-medium">{exam.title}</p>
                  {exam.description && (
                    <p className="text-xs text-muted-foreground">{exam.description}</p>
                  )}
                </div>
                <ListChecks className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <p className="text-sm text-muted-foreground">
        Recordação ativa é testar sua memória em vez de reler — revise seus flashcards devidos ou
        pratique questões do seu banco.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setView("flashcards")}
          disabled={loadingFlashcards || !dueFlashcards?.length}
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-left">
            <span className="block text-sm font-medium text-foreground">Revisar flashcards</span>
            <span className="text-xs text-muted-foreground">
              {loadingFlashcards ? "Carregando..." : `${dueFlashcards?.length ?? 0} devidos`}
            </span>
          </div>
        </button>
        <button
          onClick={() => setView("questions_list")}
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-left">
            <span className="block text-sm font-medium text-foreground">Praticar questões</span>
            <span className="text-xs text-muted-foreground">Resolva simulados</span>
          </div>
        </button>
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
