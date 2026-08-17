/**
 * CURSO V1 — leitura da estrutura real do curso.
 *
 * Não cria lógica cognitiva nova: apenas combina dados já existentes
 * (árvore do curso, documentos publicados, sessões em andamento e
 * estados de memória devidos) para descrever cada aula.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCourse } from "@/features/studies/hooks/use-courses";
import { useCourseTree } from "@/features/studies/hooks/use-course-tree";
import { useInProgressStudySessions } from "@/features/study-sessions/hooks";
import { calculateCourseProgress, calculateModuleProgress } from "@/features/studies/utils";
import type { CourseModule, Lesson } from "@/features/studies/types";

export type LessonViewState =
  | "in_progress"
  | "review_due"
  | "first_contact_done"
  | "no_material"
  | "not_started";

export interface LessonView {
  lesson: Lesson;
  state: LessonViewState;
  hasMaterial: boolean;
  activeSessionId: string | null;
}

export interface ModuleView {
  module: CourseModule;
  lessons: LessonView[];
  progress: ReturnType<typeof calculateModuleProgress>;
}

function usePublishedLessonIds(lessonIds: string[]) {
  const { user } = useAuth();
  const key = lessonIds.slice().sort().join(",");
  return useQuery({
    enabled: !!user && lessonIds.length > 0,
    queryKey: ["course-published-lessons", user?.id, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_documents")
        .select("lesson_id, published_version")
        .in("lesson_id", lessonIds);
      if (error) throw error;
      return (data ?? [])
        .filter((d) => d.published_version != null)
        .map((d) => d.lesson_id as string);
    },
  });
}

function useDueLessonIds(lessonIds: string[]) {
  const { user } = useAuth();
  const key = lessonIds.slice().sort().join(",");
  return useQuery({
    enabled: !!user && lessonIds.length > 0,
    queryKey: ["course-due-lessons", user?.id, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_states")
        .select("due, concept:concepts!inner(lesson_id)")
        .eq("is_test_data", false)
        .lte("due", new Date().toISOString())
        .in("concepts.lesson_id", lessonIds);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.concept?.lesson_id as string | undefined)
        .filter((id): id is string => !!id);
    },
  });
}

export function useCourseOverview(courseId: string | undefined) {
  const courseQuery = useCourse(courseId);
  const tree = useCourseTree(courseId);

  const modules = useMemo(
    () => (tree.modules ?? []).filter((m) => !m.is_archived),
    [tree.modules],
  );
  const lessons = useMemo(
    () => (tree.lessons ?? []).filter((l) => !l.is_archived),
    [tree.lessons],
  );

  // Expostos só para o modo Organizar (restaurar) — nunca aparecem na leitura normal do curso.
  const archivedModules = useMemo(
    () => (tree.modules ?? []).filter((m) => m.is_archived),
    [tree.modules],
  );
  const archivedLessons = useMemo(
    () => (tree.lessons ?? []).filter((l) => l.is_archived),
    [tree.lessons],
  );
  const lessonIds = useMemo(() => lessons.map((l) => l.id), [lessons]);

  const publishedQuery = usePublishedLessonIds(lessonIds);
  const dueQuery = useDueLessonIds(lessonIds);
  const sessionsQuery = useInProgressStudySessions();

  const publishedSet = useMemo(
    () => new Set(publishedQuery.data ?? []),
    [publishedQuery.data],
  );
  const dueSet = useMemo(() => new Set(dueQuery.data ?? []), [dueQuery.data]);
  const activeByLesson = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of (sessionsQuery.data ?? []) as any[]) {
      if (s.lesson_id) map.set(s.lesson_id, s.id);
    }
    return map;
  }, [sessionsQuery.data]);

  function toView(lesson: Lesson): LessonView {
    const hasMaterial = publishedSet.has(lesson.id);
    const activeSessionId = activeByLesson.get(lesson.id) ?? null;
    let state: LessonViewState;
    if (activeSessionId) state = "in_progress";
    else if (dueSet.has(lesson.id)) state = "review_due";
    else if (lesson.is_completed) state = "first_contact_done";
    else if (!hasMaterial) state = "no_material";
    else state = "not_started";
    return { lesson, state, hasMaterial, activeSessionId };
  }

  const moduleViews: ModuleView[] = useMemo(() => {
    return modules.map((module) => {
      const moduleLessons = lessons
        .filter((l) => l.module_id === module.id)
        .sort((a, b) => a.position - b.position);
      return {
        module,
        lessons: moduleLessons.map(toView),
        progress: calculateModuleProgress(moduleLessons),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, lessons, publishedSet, dueSet, activeByLesson]);

  const allLessonViews = useMemo(
    () => moduleViews.flatMap((m) => m.lessons),
    [moduleViews],
  );

  const progress = useMemo(
    () => calculateCourseProgress(modules, lessons),
    [modules, lessons],
  );

  /** Alvo real de "Continuar estudando": sessão ativa → devida → primeira não concluída. */
  const continueTarget = useMemo(() => {
    return (
      allLessonViews.find((l) => l.state === "in_progress") ??
      allLessonViews.find((l) => l.state === "review_due") ??
      allLessonViews.find((l) => !l.lesson.is_completed && l.hasMaterial) ??
      allLessonViews.find((l) => !l.lesson.is_completed) ??
      allLessonViews[0] ??
      null
    );
  }, [allLessonViews]);

  /** Curso "sem módulos" na perspectiva do usuário: um único módulo implícito. */
  const hasModules = moduleViews.length > 1;

  return {
    course: courseQuery.data,
    modules: moduleViews,
    lessons: allLessonViews,
    archivedModules,
    archivedLessons,
    hasModules,
    progress,
    continueTarget,
    isLoading:
      courseQuery.isLoading ||
      tree.isLoading ||
      sessionsQuery.isLoading ||
      (lessonIds.length > 0 && (publishedQuery.isLoading || dueQuery.isLoading)),
    isError: courseQuery.isError || tree.isError,
  };
}
