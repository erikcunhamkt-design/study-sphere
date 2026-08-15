// src/features/study-sessions/api.evidence.ts
import { supabase } from "@/integrations/supabase/client";
import type { RecallResult, ResultSource } from "./types";

export interface RecordRecallAttemptInput {
  sessionId: string;
  questionId: string;
  response: string;
  result: RecallResult;
  resultSource: ResultSource;
  confidence: number;
  responseTimeMs: number;
  publishedVersion: number | null;
}

export async function recordRecallAttempt(input: RecordRecallAttemptInput): Promise<string> {
  const { data, error } = await supabase.rpc("record_recall_attempt", {
    p_session_id: input.sessionId,
    p_question_id: input.questionId,
    p_response: input.response,
    p_result: input.result as any,
    p_result_source: input.resultSource as any,
    p_confidence: input.confidence,
    p_response_time_ms: Math.round(input.responseTimeMs),
    p_published_version: input.publishedVersion as any,
  });

  if (error) throw error;
  return data as string;
}

export interface MemoryState {
  id: string;
  userId: string;
  conceptId: string;
  stability: number;
  difficulty: number;
  due: string;
  lastReview: string | null;
  reps: number;
  lapses: number;
  state: number;
  lastRecalledAt: string | null;
  lastResult: RecallResult | null;
  lastConfidence: number | null;
  attemptCount: number;
  successfulRecalls: number;
  failedRecalls: number;
  updatedAt: string;
}


export async function getMemoryState(conceptId: string): Promise<MemoryState | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memory_states")
    .select("*")
    .eq("user_id", user.id)
    .eq("concept_id", conceptId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    conceptId: data.concept_id,
    strength: data.strength,
    stability: data.stability,
    difficulty: data.difficulty,
    lastRecalledAt: data.last_recalled_at,
    lastResult: data.last_result as RecallResult | null,
    lastConfidence: data.last_confidence,
    attemptCount: data.attempt_count,
    successfulRecalls: data.successful_recalls,
    failedRecalls: data.failed_recalls,
    updatedAt: data.updated_at
  };
}

export async function applyEvidenceToMemoryState(conceptId: string, evidenceId: string): Promise<string> {
  const { data, error } = await supabase.rpc("apply_evidence_to_memory_state", {
    p_concept_id: conceptId,
    p_evidence_id: evidenceId
  });

  if (error) throw error;
  return data as string;
}

