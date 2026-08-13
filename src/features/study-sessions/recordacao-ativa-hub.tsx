import { useState } from "react";
import { Layers, ListChecks, ChevronLeft, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDueFlashcards, useDueFlashcardsByDeck, useFlashcardsByDeck } from "@/features/flashcards/hooks";
import { ReviewSession } from "@/features/flashcards/review-session";
import { useExams, useStartExamAttempt } from "@/features/questions/hooks";
import { ExamAttemptRunner } from "@/features/questions/exam-attempt-runner";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinishExamAttemptResult } from "@/features/questions/types";
import { useDecks } from "@/features/decks/hooks";
import { cn } from "@/lib/utils";

type View = "hub" | "flashcards" | "flashcards_training" | "questions_list" | "exam_runner" | "deck_selection" | "deck_mode_selection";

export function RecordacaoAtivaHub({ 
  onBack,
  deckId: initialDeckId,
  mode: initialMode
}: { 
  onBack: () => void;
  deckId?: string;
  mode?: "review" | "training";
}) {
  const [view, setView] = useState<View>(initialDeckId ? (initialMode === "training" ? "flashcards_training" : "flashcards") : "hub");
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>(initialDeckId);
  const { data: globalDueFlashcards, isLoading: loadingFlashcards } = useDueFlashcards();
  
  const { data: decks, isLoading: loadingDecks } = useDecks();

  // Queries específicas do baralho
  const { data: deckDueFlashcards, isLoading: loadingDeckDue } = useDueFlashcardsByDeck(selectedDeckId);
  const { data: deckAllFlashcards, isLoading: loadingDeckAll } = useFlashcardsByDeck(selectedDeckId);

  const dueFlashcards = selectedDeckId ? deckDueFlashcards : globalDueFlashcards;

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

  if (view === "deck_selection") {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("hub")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">Escolha um Baralho</h3>
        </div>

        {loadingDecks ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !decks || decks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum baralho encontrado. Crie um na Biblioteca para estudar aqui.
          </p>
        ) : (
          <div className="grid gap-2">
            {decks.map((deck) => (
              <button
                key={deck.id}
                onClick={() => {
                  setSelectedDeckId(deck.id);
                  setView("deck_mode_selection");
                }}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: deck.color || "#3b82f6" }}
                  />
                  <span className="text-sm font-medium">{deck.name}</span>
                </div>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "deck_mode_selection" && selectedDeckId) {
    const deck = decks?.find(d => d.id === selectedDeckId);
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("deck_selection")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">{deck?.name}</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Escolha como deseja praticar este baralho.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setView("flashcards")}
            disabled={loadingDeckDue || !deckDueFlashcards?.length}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <RotateCcw className="h-4 w-4" />
            </span>
            <div className="text-left">
              <span className="block text-sm font-medium text-foreground">Revisar devidos</span>
              <span className="text-xs text-muted-foreground">
                {loadingDeckDue ? "..." : `${deckDueFlashcards?.length ?? 0} cartões`}
              </span>
            </div>
          </button>

          <button
            onClick={() => setView("flashcards_training")}
            disabled={loadingDeckAll || !deckAllFlashcards?.length}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Play className="h-4 w-4" />
            </span>
            <div className="text-left">
              <span className="block text-sm font-medium text-foreground">Estudar tudo</span>
              <span className="text-xs text-muted-foreground">Modo treino</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <p className="text-sm text-muted-foreground">
        Recordação ativa é testar sua memória em vez de reler — revise seus flashcards devidos ou
        pratique questões do seu banco.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => {
            setSelectedDeckId(undefined);
            setView("flashcards");
          }}
          disabled={loadingFlashcards || !globalDueFlashcards?.length}
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-left">
            <span className="block text-sm font-medium text-foreground">Revisar geral</span>
            <span className="text-xs text-muted-foreground">
              {loadingFlashcards ? "Carregando..." : `${globalDueFlashcards?.length ?? 0} devidos`}
            </span>
          </div>
        </button>

        <button
          onClick={() => setView("deck_selection")}
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-left">
            <span className="block text-sm font-medium text-foreground">Por baralho</span>
            <span className="text-xs text-muted-foreground">
              Escolha um acervo
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
            <span className="text-xs text-muted-foreground">Simulados</span>
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
