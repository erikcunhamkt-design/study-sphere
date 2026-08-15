import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as api from "./api";
export function useFlashcards() {
    return useQuery({
        queryKey: ["flashcards", "list"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return [];
            return api.fetchFlashcards(user.id);
        },
    });
}
export function useDueFlashcards(limit = 50) {
    return useQuery({
        queryKey: ["flashcards", "due", limit],
        queryFn: async () => {
            // 1. Get concept IDs that are due
            const { data: dueConcepts, error: conceptsError } = await supabase
                .from("memory_states")
                .select("concept_id, due")
                .lte("due", new Date().toISOString())
                .order("due", { ascending: true })
                .limit(limit);
            if (conceptsError)
                throw conceptsError;
            if (!dueConcepts || dueConcepts.length === 0)
                return [];
            const conceptIds = dueConcepts.map((c) => c.concept_id);
            // 2. Fetch flashcards for those concepts
            const { data: flashcards, error: flashcardsError } = await supabase
                .from("flashcards")
                .select(`
          *,
          concept:concepts (*)
        `)
                .in("concept_id", conceptIds);
            if (flashcardsError)
                throw flashcardsError;
            // Sort flashcards by the 'due' date of their concept for consistent priority
            const dueMap = new Map(dueConcepts.map(c => [c.concept_id, c]));
            return (flashcards || []).sort((a, b) => {
                const dueA = new Date(dueMap.get(a.concept_id)?.due || 0).getTime();
                const dueB = new Date(dueMap.get(b.concept_id)?.due || 0).getTime();
                return dueA - dueB;
            });
        },
    });
}
export function useDueFlashcardsByDeck(deckId, limit = 50) {
    return useQuery({
        queryKey: ["flashcards", "due", deckId, limit],
        enabled: !!deckId,
        queryFn: async () => {
            if (!deckId)
                return [];
            // 1. Get flashcards in this deck that have an associated concept
            const { data: deckCards, error: deckError } = await supabase
                .from("flashcards")
                .select("concept_id")
                .eq("deck_id", deckId)
                .not("concept_id", "is", null);
            if (deckError)
                throw deckError;
            if (!deckCards || deckCards.length === 0)
                return [];
            const conceptIds = [...new Set(deckCards.map(c => c.concept_id))];
            // 2. Check which of these concepts are due
            const { data: dueConcepts, error: conceptsError } = await supabase
                .from("memory_states")
                .select("concept_id, due")
                .in("concept_id", conceptIds)
                .lte("due", new Date().toISOString())
                .order("due", { ascending: true })
                .limit(limit);
            if (conceptsError)
                throw conceptsError;
            if (!dueConcepts || dueConcepts.length === 0)
                return [];
            const dueIds = dueConcepts.map(c => c.concept_id);
            // 3. Fetch full data for due flashcards
            const { data: flashcards, error: flashcardsError } = await supabase
                .from("flashcards")
                .select(`
          *,
          concept:concepts (*)
        `)
                .eq("deck_id", deckId)
                .in("concept_id", dueIds);
            if (flashcardsError)
                throw flashcardsError;
            const dueMap = new Map(dueConcepts.map(c => [c.concept_id, c]));
            return (flashcards || []).sort((a, b) => {
                const dueA = new Date(dueMap.get(a.concept_id)?.due || 0).getTime();
                const dueB = new Date(dueMap.get(b.concept_id)?.due || 0).getTime();
                return dueA - dueB;
            });
        },
    });
}
export function useFlashcardsByDeck(deckId) {
    return useQuery({
        queryKey: ["flashcards", "deck", deckId],
        enabled: !!deckId,
        queryFn: async () => {
            if (!deckId)
                return [];
            const { data, error } = await supabase
                .from("flashcards")
                .select(`
          *,
          concept:concepts (*)
        `)
                .eq("deck_id", deckId);
            if (error)
                throw error;
            return data;
        },
    });
}
export function useCreateFlashcard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                throw new Error("Unauthorized");
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
        mutationFn: (variables) => api.updateFlashcardContent(variables.id, variables.data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["flashcards"] });
        },
    });
}
export function useDeleteFlashcard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.deleteFlashcard(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["flashcards"] });
        },
    });
}
export function useSetFlashcardArchived() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (variables) => api.setFlashcardArchived(variables.id, variables.isArchived),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["flashcards"] });
        },
    });
}
export function useSetFlashcardsDeck() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (variables) => api.setFlashcardsDeck(variables.ids, variables.deckId),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["flashcards"] });
        },
    });
}
export function useSubmitFlashcardReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (variables) => api.submitFlashcardReview(variables.flashcardId, variables.rating),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["flashcards"] });
            void qc.invalidateQueries({ queryKey: ["memory-state"] });
            void qc.invalidateQueries({ queryKey: ["due-reviews"] });
        },
    });
}
export function useFlashcardReviews(sinceIso) {
    return useQuery({
        queryKey: ["flashcards", "reviews", sinceIso],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return [];
            return api.fetchFlashcardReviews(user.id, sinceIso);
        },
    });
}
