import { supabase } from "@/integrations/supabase/client";
import type { CreateStudyAreaInput, StudyArea, UpdateStudyAreaInput } from "../types";

const COLUMNS =
  "id, user_id, name, description, icon, color, position, is_archived, created_at, updated_at";

export async function fetchStudyAreas(userId: string): Promise<StudyArea[]> {
  // Segundo/terceiro critério (created_at, id) garantem ordem determinística
  // mesmo quando duas linhas têm a mesma position — o que pode acontecer
  // legitimamente (ex.: uma linha arquivada com position antiga que colide
  // com uma linha ativa recém-reordenada). Sem isso, o Postgres não garante
  // ordem estável entre empates, o que pareceria uma lista "embaralhando"
  // entre requisições.
  const { data, error } = await supabase
    .from("study_areas")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StudyArea[];
}

export async function fetchStudyArea(userId: string, areaId: string): Promise<StudyArea | null> {
  const { data, error } = await supabase
    .from("study_areas")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("id", areaId)
    .maybeSingle();
  if (error) throw error;
  return data as StudyArea | null;
}

export async function createStudyArea(
  userId: string,
  input: CreateStudyAreaInput,
  position: number,
): Promise<StudyArea> {
  const { data, error } = await supabase
    .from("study_areas")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description || null,
      icon: input.icon,
      color: input.color,
      position,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as StudyArea;
}

export async function updateStudyArea(areaId: string, patch: UpdateStudyAreaInput): Promise<void> {
  const { error } = await supabase.from("study_areas").update(patch).eq("id", areaId);
  if (error) throw error;
}

export async function deleteStudyArea(areaId: string): Promise<void> {
  const { error } = await supabase.from("study_areas").delete().eq("id", areaId);
  if (error) throw error;
}

export async function reorderStudyAreas(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("reorder_study_areas", { p_ids: ids });
  if (error) throw error;
}
