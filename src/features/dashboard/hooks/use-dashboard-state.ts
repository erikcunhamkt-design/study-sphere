import { useMemo } from "react";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { useInProgressStudySessions } from "@/features/study-sessions/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import { calculateCourseProgress } from "@/features/studies/utils";
import { useAllCourseModules } from "@/features/studies/hooks/use-course-modules";

export function useDashboardState() {
  const { data: dueFlashcards, isLoading: loadingDue } = useDueFlashcards();
  const { data: inProgressSessions, isLoading: loadingProgress } = useInProgressStudySessions();
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: allLessons, isLoading: loadingLessons } = useAllLessons();
  const { data: areas, isLoading: loadingAreas } = useStudyAreas();
  const { data: modules, isLoading: loadingModules } = useAllCourseModules();

  const isLoading =
    loadingDue ||
    loadingProgress ||
    loadingCourses ||
    loadingLessons ||
    loadingAreas ||
    loadingModules;

  const state = useMemo(() => {
    if (isLoading) return { priority: "loading" as const, data: {} };

    // 1. Prioridade: Revisão Urgente
    if (dueFlashcards && dueFlashcards.length > 0) {
      return {
        priority: "review" as const,
        data: { count: dueFlashcards.length },
      };
    }

    // 2. Prioridade: Conteúdo Interrompido
    if (inProgressSessions && inProgressSessions.length > 0) {
      return {
        priority: "resume" as const,
        data: { session: inProgressSessions[0] },
      };
    }

    // 3. Prioridade: Recomendação (Cursos em andamento)
    const activeCourses = (courses ?? []).filter((c) => !c.is_archived);
    const inProgressCourses = activeCourses.filter((c) => c.status === "in_progress");

    if (inProgressCourses.length > 0) {
      const target = inProgressCourses[0];
      const courseModules = (modules ?? []).filter((m) => m.course_id === target.id);
      const courseLessons = (allLessons ?? []).filter((l) => l.course_id === target.id);
      const progress = calculateCourseProgress(courseModules, courseLessons);

      return {
        priority: "recommendation" as const,
        data: { course: target, progress },
      };
    }

    // 4. Prioridade: Primeiro Estudo (Possui conteúdo mas nada em andamento)
    if (activeCourses.length > 0) {
      return {
        priority: "start_study" as const,
        data: { course: activeCourses[0] },
      };
    }

    // 5. Prioridade: Manutenção / Novo Usuário (Sem conteúdo)
    const hasAreas = (areas?.length ?? 0) > 0;
    if (!hasAreas) {
      return { priority: "onboarding" as const, data: {} };
    }

    return { priority: "maintenance" as const, data: {} };
  }, [isLoading, dueFlashcards, inProgressSessions, courses, allLessons, areas, modules]);

  return { ...state, isLoading, dueFlashcards, courses, allLessons, modules };
}

