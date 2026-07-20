import { useCourseModules } from "./use-course-modules";
import { useLessonsByCourse } from "./use-lessons";
import { calculateCourseProgress } from "../utils";

/**
 * Combina módulos + todas as aulas do curso — mesma composição de
 * `useStudyAreasWithCounts` (Fase 02.1): duas queries já cacheadas
 * separadamente, unidas aqui só para a árvore/página do curso.
 */
export function useCourseTree(courseId: string | undefined) {
  const modulesQuery = useCourseModules(courseId);
  const lessonsQuery = useLessonsByCourse(courseId);

  return {
    modules: modulesQuery.data,
    lessons: lessonsQuery.data,
    isLoading: modulesQuery.isLoading || lessonsQuery.isLoading,
    isError: modulesQuery.isError || lessonsQuery.isError,
    error: modulesQuery.error ?? lessonsQuery.error,
  };
}

export function useCourseProgress(courseId: string | undefined) {
  const { modules, lessons, isLoading, isError } = useCourseTree(courseId);
  return {
    progress: calculateCourseProgress(modules ?? [], lessons ?? []),
    isLoading,
    isError,
  };
}
