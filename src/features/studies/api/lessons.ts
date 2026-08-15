import { supabase } from "@/integrations/supabase/client";
import type { CreateLessonInput, Lesson, UpdateLessonInput } from "../types";

const COLUMNS =
  "id, user_id, course_id, module_id, title, description, position, is_completed, completed_at, is_archived, is_test_data, created_at, updated_at";

export async function fetchLessonsByModule(userId: string, moduleId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .eq("is_test_data", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Lesson[];
}

/** Todas as aulas do curso (em qualquer módulo) — usado para o progresso do curso. */
export async function fetchLessonsByCourse(userId: string, courseId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("is_test_data", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Lesson[];
}

/** Todas as aulas do usuário (qualquer curso/módulo) — usado para contagens agregadas (ex.: exclusão de área). */
export async function fetchAllLessons(userId: string): Promise<Lesson[]> {
  const { data, error } = await supabase.from("lessons").select(COLUMNS).eq("user_id", userId).eq("is_test_data", false);
  if (error) throw error;
  return (data ?? []) as Lesson[];
}

export async function fetchLesson(userId: string, lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw error;
  return data as Lesson | null;
}

export async function createLesson(
  userId: string,
  input: CreateLessonInput,
  position: number,
): Promise<Lesson> {
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      user_id: userId,
      course_id: input.course_id,
      module_id: input.module_id,
      title: input.title,
      description: input.description || null,
      is_completed: input.is_completed ?? false,
      position,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Lesson;
}

export async function updateLesson(lessonId: string, patch: UpdateLessonInput): Promise<void> {
  const { error } = await supabase.from("lessons").update(patch).eq("id", lessonId);
  if (error) throw error;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function reorderLessons(moduleId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("reorder_lessons", {
    p_module_id: moduleId,
    p_ids: ids,
  });
  if (error) throw error;
}
