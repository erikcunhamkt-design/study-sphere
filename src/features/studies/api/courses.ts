import { supabase } from "@/integrations/supabase/client";
import type { Course, CreateCourseInput, UpdateCourseInput } from "../types";

const COLUMNS =
  "id, user_id, study_area_id, name, description, status, position, is_favorite, is_archived, is_test_data, created_at, updated_at";

// Segundo/terceiro critério (created_at, id) garantem ordem determinística
// mesmo quando duas linhas têm a mesma position (ex.: uma arquivada com
// position antiga colidindo com uma ativa recém-reordenada) — sem isso o
// Postgres não garante ordem estável entre empates.
export async function fetchCoursesByArea(userId: string, areaId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("study_area_id", areaId)
    .eq("is_test_data", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Course[];
}

/** Todos os cursos do usuário — usado para contagens por área e para o dashboard. */
export async function fetchAllCourses(userId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("is_test_data", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function fetchCourse(userId: string, courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data as Course | null;
}

export async function createCourse(
  userId: string,
  input: CreateCourseInput,
  position: number,
): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .insert({
      user_id: userId,
      study_area_id: input.study_area_id,
      name: input.name,
      description: input.description || null,
      status: input.status ?? "not_started",
      position,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(courseId: string, patch: UpdateCourseInput): Promise<void> {
  const { error } = await supabase.from("courses").update(patch).eq("id", courseId);
  if (error) throw error;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function reorderCourses(studyAreaId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("reorder_courses", {
    p_study_area_id: studyAreaId,
    p_ids: ids,
  });
  if (error) throw error;
}
