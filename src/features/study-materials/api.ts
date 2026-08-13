import { supabase } from "@/integrations/supabase/client";
import type { StudyMaterialRow, StudyMaterialInsert, StudyMaterialUpdate } from "./types";

const MATERIAL_COLUMNS = "id, user_id, title, url, type, note, course_id, is_archived, created_at, updated_at";

export async function fetchStudyMaterials(userId: string): Promise<StudyMaterialRow[]> {
  const { data, error } = await supabase
    .from("study_materials")
    .select(MATERIAL_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return (data ?? []) as unknown as StudyMaterialRow[];
}

export async function createStudyMaterial(userId: string, input: Omit<StudyMaterialInsert, "user_id">): Promise<StudyMaterialRow> {
  const { data, error } = await supabase
    .from("study_materials")
    .insert({
      ...input,
      user_id: userId,
    })
    .select(MATERIAL_COLUMNS)
    .single();
  
  if (error) throw error;
  return data as unknown as StudyMaterialRow;
}

export async function updateStudyMaterial(id: string, input: StudyMaterialUpdate): Promise<StudyMaterialRow> {
  const { data, error } = await supabase
    .from("study_materials")
    .update(input)
    .eq("id", id)
    .select(MATERIAL_COLUMNS)
    .single();
  
  if (error) throw error;
  return data as unknown as StudyMaterialRow;
}

export async function deleteStudyMaterial(id: string): Promise<void> {
  const { error } = await supabase
    .from("study_materials")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}
