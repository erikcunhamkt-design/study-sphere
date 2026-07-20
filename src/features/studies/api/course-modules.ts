import { supabase } from "@/integrations/supabase/client";
import type { CourseModule, CreateCourseModuleInput, UpdateCourseModuleInput } from "../types";

const COLUMNS =
  "id, user_id, course_id, name, description, position, is_archived, created_at, updated_at";

// Segundo/terceiro critério (created_at, id) garantem ordem determinística
// mesmo quando duas linhas têm a mesma position — mesmo padrão de
// study-areas.ts/courses.ts (Fase 02.1).
export async function fetchCourseModules(
  userId: string,
  courseId: string,
): Promise<CourseModule[]> {
  const { data, error } = await supabase
    .from("course_modules")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CourseModule[];
}

/** Todos os módulos do usuário (qualquer curso) — usado para contagens agregadas (ex.: exclusão de área). */
export async function fetchAllCourseModules(userId: string): Promise<CourseModule[]> {
  const { data, error } = await supabase
    .from("course_modules")
    .select(COLUMNS)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as CourseModule[];
}

export async function fetchCourseModule(
  userId: string,
  moduleId: string,
): Promise<CourseModule | null> {
  const { data, error } = await supabase
    .from("course_modules")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("id", moduleId)
    .maybeSingle();
  if (error) throw error;
  return data as CourseModule | null;
}

export async function createCourseModule(
  userId: string,
  input: CreateCourseModuleInput,
  position: number,
): Promise<CourseModule> {
  const { data, error } = await supabase
    .from("course_modules")
    .insert({
      user_id: userId,
      course_id: input.course_id,
      name: input.name,
      description: input.description || null,
      position,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as CourseModule;
}

export async function updateCourseModule(
  moduleId: string,
  patch: UpdateCourseModuleInput,
): Promise<void> {
  const { error } = await supabase.from("course_modules").update(patch).eq("id", moduleId);
  if (error) throw error;
}

export async function deleteCourseModule(moduleId: string): Promise<void> {
  const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
  if (error) throw error;
}

export async function reorderCourseModules(courseId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("reorder_course_modules", {
    p_course_id: courseId,
    p_ids: ids,
  });
  if (error) throw error;
}
