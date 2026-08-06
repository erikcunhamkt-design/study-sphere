import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { StudyMethod, StudySessionDetails, StudySessionRow } from "./types";

const STUDY_SESSION_COLUMNS =
  "id, user_id, lesson_id, method, started_at, ended_at, duration_seconds, details, created_at, updated_at";

export async function fetchInProgressStudySessions(userId: string): Promise<StudySessionRow[]> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select(STUDY_SESSION_COLUMNS)
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StudySessionRow[];
}

export async function fetchRecentStudySessions(
  userId: string,
  limit: number,
): Promise<StudySessionRow[]> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select(STUDY_SESSION_COLUMNS)
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as StudySessionRow[];
}

/** Soma de duration_seconds das sessões finalizadas desde um instante — agregada no cliente, mesmo padrão de flashcard-metrics. */
export async function fetchStudySessionSecondsSince(
  userId: string,
  sinceIso: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("duration_seconds")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .gte("started_at", sinceIso);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0);
}

export interface CreateStudySessionInput {
  method: StudyMethod;
  lessonId: string | null;
  details: StudySessionDetails;
}

export async function createStudySession(
  userId: string,
  input: CreateStudySessionInput,
): Promise<StudySessionRow> {
  const t0 = performance.now();
  console.log("[perf] createStudySession: antes do getSession");
  const { data: sess } = await supabase.auth.getSession();
  const t1 = performance.now();
  console.log(`[perf] getSession levou ${(t1 - t0).toFixed(0)}ms; token? ${!!sess.session?.access_token}`);

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: userId,
      method: input.method,
      lesson_id: input.lessonId,
      details: input.details as unknown as Json,
    })
    .select(STUDY_SESSION_COLUMNS)
    .single();

  const t2 = performance.now();
  console.log(`[perf] insert levou ${(t2 - t1).toFixed(0)}ms; erro? ${error?.message ?? "nenhum"}`);

  if (error) throw error;
  return data as unknown as StudySessionRow;
}

/**
 * Fecha a sessão (ended_at write-once, garantido pelo trigger do banco).
 * ended_at vem do relógio do cliente, não de um now() no servidor — não há
 * RPC aqui (decisão do Gate 1), então não existe um now() de servidor
 * disponível para essa escrita. started_at, porém, veio do now() do
 * SERVIDOR (DEFAULT da coluna) — se o relógio do servidor estiver à frente
 * do cliente (achado medido no Gate 4 da 05.1: ~3,8s), concluir a sessão
 * nos primeiros segundos geraria ended_at < started_at e estouraria o
 * CHECK (23514). Clampa em Math.max(now, startedAt): nesse caso grava
 * ended_at = startedAt (duração 0, honesto — a sessão realmente durou
 * menos de 1s de relógio) em vez de deixar o UPDATE falhar.
 */
export async function finishStudySession(
  sessionId: string,
  startedAtIso: string,
  details: StudySessionDetails,
): Promise<StudySessionRow> {
  const now = Date.now();
  const startedAt = new Date(startedAtIso).getTime();
  const endedAt = new Date(Math.max(now, startedAt)).toISOString();

  const { data, error } = await supabase
    .from("study_sessions")
    .update({ ended_at: endedAt, details: details as unknown as Json })
    .eq("id", sessionId)
    .select(STUDY_SESSION_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as StudySessionRow;
}

export async function deleteStudySession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("study_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}
