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
