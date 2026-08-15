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
