import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as api from "./api";
import type { FlashcardRating } from "./schema";
import type { UpdateFlashcardContentInput, CreateFlashcardInput } from "./api";

export function useFlashcards() {
  return useQuery({
    queryKey: ["flashcards", "list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return api.fetchFlashcards(user.id);
    },
  });
}

export function useDueFlashcards(limit = 50) {
  return useQuery({
    queryKey: ["flashcards", "due", limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return api.fetchDueFlashcards(user.id);
    },
  });
}

export function useDueFlashcardsByDeck(deckId?: string, limit = 50) {
  return useQuery({
    queryKey: ["flashcards", "due", deckId, limit],
    enabled: !!deckId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !deckId) return [];
      return api.fetchDueFlashcardsByDeck(user.id, deckId);
    },
  });
}

export function useFlashcardsByDeck(deckId?: string) {
  return useQuery({
    queryKey: ["flashcards", "deck", deckId],
    enabled: !!deckId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !deckId) return [];
      return api.fetchFlashcardsByDeck(user.id, deckId);
    },
  });
}

export function useCreateFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFlashcardInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      return api.createFlashcard(user.id, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });
}

export function useUpdateFlashcardContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string; data: UpdateFlashcardContentInput }) =>
      api.updateFlashcardContent(variables.id, variables.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });
}

export function useDeleteFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFlashcard(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });
}

export function useSetFlashcardArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string; isArchived: boolean }) =>
      api.setFlashcardArchived(variables.id, variables.isArchived),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });
}

export function useSetFlashcardsDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: { ids: string[]; deckId: string | null }) =>
      api.setFlashcardsDeck(variables.ids, variables.deckId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });
}

export function useSubmitFlashcardReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: { flashcardId: string; rating: FlashcardRating }) =>
      api.submitFlashcardReview(variables.flashcardId, variables.rating),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
      void qc.invalidateQueries({ queryKey: ["memory-state"] });
      void qc.invalidateQueries({ queryKey: ["due-reviews"] });
    },
  });
}

export function useFlashcardReviews(sinceIso: string) {
  return useQuery({
    queryKey: ["flashcards", "reviews", sinceIso],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return api.fetchFlashcardReviews(user.id, sinceIso);
    },
  });
}
