import { FSRSScheduler, DEFAULT_PARAMS, Card, State, mapEvidenceToRating, ALGORITHM_NAME, ALGORITHM_VERSION, detectMetacognitiveMismatch } from "./fsrs";
import { RecallResult } from "@/features/study-sessions/types";

export interface MemoryEngineInput {
  conceptId: string;
  userId: string;
  history: Array<{
    result: RecallResult;
    confidence: number;
    attemptedAt: string;
  }>;
}

export class MemoryEngine {
  private scheduler: FSRSScheduler;

  constructor() {
    this.scheduler = new FSRSScheduler(DEFAULT_PARAMS);
  }

  /**
   * Rebuilds the memory state from the full evidence history.
   */
  rebuild(input: MemoryEngineInput): Card {
    let card: Card = {
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
    };

    // Sort history by attemptedAt
    const sortedHistory = [...input.history].sort(
      (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
    );

    for (const entry of sortedHistory) {
      const rating = mapEvidenceToRating(entry.result, entry.confidence);
      const record = this.scheduler.repeat(card, new Date(entry.attemptedAt));
      card = record[rating].card;
    }

    return card;
  }

  /**
   * Calculates the next state for a single review.
   */
  applyReview(currentCard: Card, result: RecallResult, confidence: number, now: Date) {
    const rating = mapEvidenceToRating(result, confidence);
    const record = this.scheduler.repeat(currentCard, now);
    const mismatch = detectMetacognitiveMismatch(result, confidence);
    
    return {
      ...record[rating],
      mismatch,
      algorithm: ALGORITHM_NAME,
      version: ALGORITHM_VERSION
    };
  }
}

export const memoryEngine = new MemoryEngine();
