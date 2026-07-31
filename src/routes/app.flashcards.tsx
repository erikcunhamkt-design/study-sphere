import { createFileRoute } from "@tanstack/react-router";
import { Layers, Plus } from "lucide-react";
import { useState } from "react";

import { EmptyState, PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardFormDialog } from "@/features/flashcards/flashcard-form-dialog";
import { FlashcardList } from "@/features/flashcards/flashcard-list";
import { FlashcardMetrics } from "@/features/flashcards/flashcard-metrics";
import { useDueFlashcards, useFlashcards } from "@/features/flashcards/hooks";
import { ReviewSession } from "@/features/flashcards/review-session";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [reviewing, setReviewing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { data: due, isLoading: dueLoading } = useDueFlashcards();
  const { data: all, isLoading: allLoading } = useFlashcards();

  if (reviewing) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Revisão"
          description="Avalie cada cartão com honestidade — é isso que ajusta o intervalo até a próxima vez."
        />
        <ReviewSession queue={due ?? []} onFinish={() => setReviewing(false)} />
      </div>
    );
  }

  const isLoading = allLoading || dueLoading;
  const hasCards = !!all && all.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flashcards"
        description="Crie cartões, revise conteúdos e acompanhe sua retenção."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Novo cartão
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !hasCards ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden />}
          title="Sem cartões criados"
          description="Crie um cartão manualmente ou converta uma Pergunta de revisão do caderno de uma aula."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm text-muted-foreground">Cartões devidos agora</p>
              <p className="text-2xl font-semibold text-foreground">{due?.length ?? 0}</p>
            </div>
            <Button onClick={() => setReviewing(true)} disabled={!due || due.length === 0}>
              Começar revisão
            </Button>
          </div>

          <FlashcardMetrics />

          <FlashcardList cards={all ?? []} />
        </>
      )}

      <FlashcardFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
