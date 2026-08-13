import type { FlashcardContent, FlashcardRating } from "./schema";

export type FlashcardState = "novo" | "aprendendo" | "revisao";

export interface FlashcardRow {
  id: string;
  user_id: string;
  lesson_id: string | null;
  deck_id: string | null;
  source_block_id: string | null;
  front: FlashcardContent;
  back: FlashcardContent;
  state: FlashcardState;
  learning_step: number;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  due_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashcardReviewRow {
  id: string;
  user_id: string;
  flashcard_id: string;
  reviewed_at: string;
  rating: FlashcardRating;
  resulting_state: FlashcardState;
  resulting_interval_days: number;
  resulting_ease: number;
}

export interface SubmitFlashcardReviewResult {
  flashcard_id: string;
  state: FlashcardState;
  learning_step: number;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  due_at: string;
}
