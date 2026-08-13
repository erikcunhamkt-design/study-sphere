import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { textFromInlineContent, type FlashcardRating } from "./schema";
import { useSubmitFlashcardReview } from "./hooks";
import type { FlashcardRow } from "./types";

const RATING_ORDER: FlashcardRating[] = ["errei", "dificil", "bom", "facil"];

const RATING_LABELS: Record<FlashcardRating, string> = {
  errei: "Errei",
  dificil: "Difícil",
  bom: "Bom",
  facil: "Fácil",
};

interface ReviewSessionProps {
  /** Fila carregada uma vez ao abrir a sessão — revisar não recarrega do
   * servidor no meio (evita a fila reordenar sob o usuário); cada
   * revisão real ainda é enviada e persistida imediatamente. */
  queue: FlashcardRow[];
  onFinish: () => void;
  isTrainingMode?: boolean;
}

export function ReviewSession({ 
  queue: initialQueue, 
  onFinish,
  isTrainingMode = false
}: ReviewSessionProps) {

  const [queue, setQueue] = useState(initialQueue);
  const [showBack, setShowBack] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const submitReview = useSubmitFlashcardReview();

  const current = queue[0];

  async function handleRate(rating: FlashcardRating) {
    if (!current) return;
    try {
      if (!isTrainingMode) {
        await submitReview.mutateAsync({ flashcardId: current.id, rating });
      }

      setReviewedCount((n) => n + 1);
      setQueue((q) => q.slice(1));
      setShowBack(false);
    } catch (err) {
      console.error("[flashcards] falha ao registrar revisão", err);
      toast.error("Não foi possível registrar a revisão. Tente novamente.");
    }
  }

  if (!current) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-lg font-medium text-foreground">Sessão concluída</p>
        <p className="text-sm text-muted-foreground">
          {reviewedCount === 0
            ? "Nenhum cartão estava devido."
            : `${reviewedCount} ${reviewedCount === 1 ? "cartão revisado" : "cartões revisados"}.`}
        </p>
        <Button onClick={onFinish}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{queue.length} restantes nesta sessão</p>
        <Button variant="ghost" size="sm" onClick={onFinish}>
          Encerrar
        </Button>
      </div>

      <div className="min-h-32 rounded-lg border border-border p-4 text-lg text-foreground">
        {textFromInlineContent(current.front)}
      </div>

      {showBack ? (
        <div className="min-h-32 rounded-lg border border-dashed border-border p-4 text-lg text-muted-foreground">
          {textFromInlineContent(current.back)}
        </div>
      ) : null}

      {!showBack ? (
        <Button onClick={() => setShowBack(true)} className="w-full">
          Mostrar resposta
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATING_ORDER.map((rating) => (
            <Button
              key={rating}
              variant={rating === "errei" ? "destructive" : "outline"}
              onClick={() => void handleRate(rating)}
              disabled={submitReview.isPending}
            >
              {RATING_LABELS[rating]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
