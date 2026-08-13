import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
import type { FlashcardRating } from "./schema";

export function flashcardsKey(userId: string | undefined) {
  return ["flashcards", userId] as const;
}

export function dueFlashcardsKey(userId: string | undefined) {
  return ["flashcards-due", userId] as const;
}

export function flashcardReviewsKey(userId: string | undefined, sinceIso: string | undefined) {
  return ["flashcard-reviews", userId, sinceIso] as const;
}

export function useFlashcards() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: flashcardsKey(user?.id),
    queryFn: () => api.fetchFlashcards(user!.id),
  });
}

export function useDueFlashcards() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: dueFlashcardsKey(user?.id),
    queryFn: () => api.fetchDueFlashcards(user!.id),
  });
}

export function useFlashcardsByDeck(deckId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!deckId,
    queryKey: [...flashcardsKey(user?.id), deckId],
    queryFn: () => api.fetchFlashcardsByDeck(user!.id, deckId!),
  });
}

export function useDueFlashcardsByDeck(deckId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!deckId,
    queryKey: [...dueFlashcardsKey(user?.id), deckId],
    queryFn: () => api.fetchDueFlashcardsByDeck(user!.id, deckId!),
  });
}

/** `sinceIso` fixo por render (não `new Date()` direto) evita invalidar/refazer a query a cada rerender. */

export function useFlashcardReviews(sinceIso: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!sinceIso,
    queryKey: flashcardReviewsKey(user?.id, sinceIso),
    queryFn: () => api.fetchFlashcardReviews(user!.id, sinceIso!),
  });
}

function useInvalidateFlashcardLists() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: flashcardsKey(user?.id) });
    void qc.invalidateQueries({ queryKey: dueFlashcardsKey(user?.id) });
  };
}

export function useCreateFlashcard() {
  const { user } = useAuth();
  const invalidate = useInvalidateFlashcardLists();
  return useMutation({
    mutationFn: (input: api.CreateFlashcardInput) => api.createFlashcard(user!.id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateFlashcardContent(flashcardId: string) {
  const invalidate = useInvalidateFlashcardLists();
  return useMutation({
    mutationFn: (input: api.UpdateFlashcardContentInput) =>
      api.updateFlashcardContent(flashcardId, input),
    onSuccess: invalidate,
  });
}

export function useSetFlashcardArchived(flashcardId: string) {
  const invalidate = useInvalidateFlashcardLists();
  return useMutation({
    mutationFn: (isArchived: boolean) => api.setFlashcardArchived(flashcardId, isArchived),
    onSuccess: invalidate,
  });
}

export function useDeleteFlashcard() {
  const invalidate = useInvalidateFlashcardLists();
  return useMutation({
    mutationFn: (flashcardId: string) => api.deleteFlashcard(flashcardId),
    onSuccess: invalidate,
  });
}

export function useSubmitFlashcardReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidateLists = useInvalidateFlashcardLists();
  return useMutation({
    mutationFn: ({ flashcardId, rating }: { flashcardId: string; rating: FlashcardRating }) =>
      api.submitFlashcardReview(flashcardId, rating),
    onSuccess: () => {
      invalidateLists();
      // Prefixo parcial: invalida qualquer janela de métricas em cache
      // (["flashcard-reviews", userId, sinceIso]), não só uma sinceIso específica.
      void qc.invalidateQueries({ queryKey: ["flashcard-reviews", user?.id] });
    },
  });
}

export function useSetFlashcardsDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidateLists = useInvalidateFlashcardLists();
  return useMutation({
    mutationFn: ({ flashcardIds, deckId }: { flashcardIds: string[]; deckId: string | null }) =>
      api.setFlashcardsDeck(flashcardIds, deckId),
    onSuccess: () => {
      invalidateLists();
      void qc.invalidateQueries({ queryKey: ["decks", user?.id] });
    },
  });
}
