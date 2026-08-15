import { Rating } from "./types";
import { RecallResult } from "@/features/study-sessions/types";

/**
 * Dominus Evidence Adapter
 * Maps user evidence to FSRS ratings.
 */
export function mapEvidenceToRating(
  result: RecallResult,
  confidence: number
): Rating {
  // 1. Result-based logic
  if (result === "incorrect" || result === "no_answer" || result === "abandoned" || result === "self_reported_incorrect") {
    return Rating.Again;
  }

  if (result === "partial" || result === "self_reported_partial") {
    return confidence >= 3 ? Rating.Hard : Rating.Again;
  }

  if (result === "correct" || result === "self_reported_correct") {
    if (confidence === 4) return Rating.Easy;
    if (confidence === 3) return Rating.Good;
    return Rating.Hard; // Correct but low confidence
  }

  return Rating.Again; // Fallback
}

/**
 * Mismatch Detection
 * Returns true if the user's confidence was high but the result was failure.
 */
export function detectMetacognitiveMismatch(
  result: RecallResult,
  confidence: number
): boolean {
  const isFailure = ["incorrect", "no_answer", "self_reported_incorrect"].includes(result);
  const isHighConfidence = confidence === 4;
  return isFailure && isHighConfidence;
}
