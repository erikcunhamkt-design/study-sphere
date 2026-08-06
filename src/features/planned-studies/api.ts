import { supabase } from "@/integrations/supabase/client";
import type { PlannedStatus, PlannedStudyRow } from "./types";

const PLANNED_COLUMNS =
  "id, user_id, title, scheduled_date, study_area_id, course_id, estimated_minutes, status, study_session_id, created_at, updated_at";

/** Estudos planejados de um usuário num intervalo de dias civis [fromDate, toDate] (YYYY-MM-DD). */
export async function fetchPlannedStudiesInRange(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<PlannedStudyRow[]> {
  const { data, error } = await supabase
    .from("planned_studies")
    .select(PLANNED_COLUMNS)
    .eq("user_id", userId)
    .gte("scheduled_date", fromDate)
    .lte("scheduled_date", toDate)
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PlannedStudyRow[];
}

export interface CreatePlannedStudyInput {
  title: string;
  scheduledDate: string;
  studyAreaId: string | null;
  courseId: string | null;
  estimatedMinutes: number | null;
}

export async function createPlannedStudy(
  userId: string,
  input: CreatePlannedStudyInput,
): Promise<PlannedStudyRow> {
  const { data, error } = await supabase
    .from("planned_studies")
    .insert({
      user_id: userId,
      title: input.title,
      scheduled_date: input.scheduledDate,
      study_area_id: input.studyAreaId,
      course_id: input.courseId,
      estimated_minutes: input.estimatedMinutes,
    })
    .select(PLANNED_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as PlannedStudyRow;
}

export interface UpdatePlannedStudyInput {
  title: string;
  scheduledDate: string;
  studyAreaId: string | null;
  courseId: string | null;
  estimatedMinutes: number | null;
}

export async function updatePlannedStudy(
  id: string,
  input: UpdatePlannedStudyInput,
): Promise<PlannedStudyRow> {
  const { data, error } = await supabase
    .from("planned_studies")
    .update({
      title: input.title,
      scheduled_date: input.scheduledDate,
      study_area_id: input.studyAreaId,
      course_id: input.courseId,
      estimated_minutes: input.estimatedMinutes,
    })
    .eq("id", id)
    .select(PLANNED_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as PlannedStudyRow;
}

/** Muda só o status (ex.: marcar 'skipped' ou voltar para 'planned'). */
export async function setPlannedStudyStatus(
  id: string,
  status: PlannedStatus,
): Promise<PlannedStudyRow> {
  const { data, error } = await supabase
    .from("planned_studies")
    .update({ status })
    .eq("id", id)
    .select(PLANNED_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as PlannedStudyRow;
}

export async function deletePlannedStudy(id: string): Promise<void> {
  const { error } = await supabase.from("planned_studies").delete().eq("id", id);
  if (error) throw error;
}

/** Vincula uma sessão concluída ao planejamento e marca como 'completed' (Opção A). */
export async function linkSessionAndComplete(
  plannedId: string,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("planned_studies")
    .update({ study_session_id: sessionId, status: "completed" })
    .eq("id", plannedId);
  if (error) throw error;
}

/** Marca um planejamento como concluído manualmente, sem sessão vinculada (rede de segurança). */
export async function completePlannedStudyManually(plannedId: string): Promise<void> {
  const { error } = await supabase
    .from("planned_studies")
    .update({ status: "completed" })
    .eq("id", plannedId);
  if (error) throw error;
}

/** Duração real das sessões vinculadas a um conjunto de planejamentos (feedback visual). */
export async function fetchLinkedSessionDurations(
  sessionIds: string[],
): Promise<Record<string, number | null>> {
  if (sessionIds.length === 0) return {};
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, duration_seconds")
    .in("id", sessionIds);
  if (error) throw error;
  const map: Record<string, number | null> = {};
  for (const row of data ?? []) {
    map[(row as { id: string }).id] = (row as { duration_seconds: number | null }).duration_seconds;
  }
  return map;
}
