import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { FlashcardContent, FlashcardRating } from "./schema";
import type { FlashcardReviewRow, FlashcardRow, SubmitFlashcardReviewResult } from "./types";

const FLASHCARD_COLUMNS =
  "id, user_id, lesson_id, deck_id, source_block_id, front, back, state, learning_step, interval_days, ease, reps, lapses, due_at, is_archived, created_at, updated_at";

export async function fetchFlashcards(userId: string): Promise<FlashcardRow[]> {
  const { data, error } = await supabase
    .from("flashcards")
    .select(FLASHCARD_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FlashcardRow[];
}

/** Fila de revisão: nunca revisado ainda, ou já devido agora. Nunca inclui arquivados. */
export async function fetchDueFlashcards(userId: string): Promise<FlashcardRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("flashcards")
    .select(FLASHCARD_COLUMNS)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .or(`state.eq.novo,due_at.lte.${nowIso}`)
    .order("due_at", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as unknown as FlashcardRow[];
}

export async function fetchFlashcardsByDeck(userId: string, deckId: string): Promise<FlashcardRow[]> {
  const { data, error } = await supabase
    .from("flashcards")
    .select(FLASHCARD_COLUMNS)
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FlashcardRow[];
}

/** Fila de revisão de um baralho específico. */
export async function fetchDueFlashcardsByDeck(userId: string, deckId: string): Promise<FlashcardRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("flashcards")
    .select(FLASHCARD_COLUMNS)
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .eq("is_archived", false)
    .or(`state.eq.novo,due_at.lte.${nowIso}`)
    .order("due_at", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as unknown as FlashcardRow[];
}

export interface CreateFlashcardInput {

  lessonId: string | null;
  deckId: string | null;
  sourceBlockId: string | null;
  front: FlashcardContent;
  back: FlashcardContent;
}

export async function createFlashcard(
  userId: string,
  input: CreateFlashcardInput,
): Promise<FlashcardRow> {
  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      lesson_id: input.lessonId,
      deck_id: input.deckId,
      source_block_id: input.sourceBlockId,
      front: input.front as unknown as Json,
      back: input.back as unknown as Json,
    })
    .select(FLASHCARD_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as FlashcardRow;
}

export interface UpdateFlashcardContentInput {
  lessonId: string | null;
  deckId: string | null;
  front: FlashcardContent;
  back: FlashcardContent;
}

export async function updateFlashcardContent(
  flashcardId: string,
  input: UpdateFlashcardContentInput,
): Promise<FlashcardRow> {
  const { data, error } = await supabase
    .from("flashcards")
    .update({
      lesson_id: input.lessonId,
      deck_id: input.deckId,
      front: input.front as unknown as Json,
      back: input.back as unknown as Json,
    })
    .eq("id", flashcardId)
    .select(FLASHCARD_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as FlashcardRow;
}

export async function setFlashcardArchived(
  flashcardId: string,
  isArchived: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("flashcards")
    .update({ is_archived: isArchived })
    .eq("id", flashcardId);
  if (error) throw error;
}

export async function setFlashcardsDeck(
  flashcardIds: string[],
  deckId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("flashcards")
    .update({ deck_id: deckId })
    .in("id", flashcardIds);
  if (error) throw error;
}

export async function deleteFlashcard(flashcardId: string): Promise<void> {
  const { error } = await supabase.from("flashcards").delete().eq("id", flashcardId);
  if (error) throw error;
}

/**
 * Único ponto que avança o agendamento de um cartão. O cliente nunca
 * calcula interval/ease/due_at/state — só envia a nota; a RPC
 * (SECURITY INVOKER, trava a linha com lock_timeout) faz toda a
 * matemática do SM-2 simplificado e devolve o resultado.
 */
export async function submitFlashcardReview(
  flashcardId: string,
  rating: FlashcardRating,
): Promise<SubmitFlashcardReviewResult> {
  const { data, error } = await supabase.rpc("submit_flashcard_review", {
    p_flashcard_id: flashcardId,
    p_rating: rating,
  });
  if (error) throw error;
  return data as unknown as SubmitFlashcardReviewResult;
}

export async function fetchFlashcardReviews(
  userId: string,
  sinceIso: string,
): Promise<FlashcardReviewRow[]> {
  const { data, error } = await supabase
    .from("flashcard_reviews")
    .select(
      "id, user_id, flashcard_id, reviewed_at, rating, resulting_state, resulting_interval_days, resulting_ease",
    )
    .eq("user_id", userId)
    .gte("reviewed_at", sinceIso)
    .order("reviewed_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FlashcardReviewRow[];
}
