import { useMemo } from "react";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { useInProgressStudySessions, useRecentStudySessions } from "@/features/study-sessions/hooks";
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
  const { data: recentSessions, isLoading: loadingRecent } = useRecentStudySessions(1);

  const isLoading =
    loadingDue ||
    loadingProgress ||
    loadingCourses ||
    loadingLessons ||
    loadingAreas ||
    loadingModules ||
    loadingRecent;

  const state = useMemo(() => {
    if (isLoading) return { priority: "loading" as const, data: {} };

    // 1. Prioridade: Conteúdo Interrompido (Sessão em andamento)
    if (inProgressSessions && inProgressSessions.length > 0) {
      const lesson = allLessons?.find(l => l.id === session.lesson_id);
      const course = courses?.find(c => c.id === lesson?.course_id);
      const module = modules?.find(m => m.id === lesson?.module_id);

      // Metadados reais da sessão
      const details = session.details as any;
      
      // Tentar encontrar título real (preferência: Lesson -> Course -> Planned Title -> Fallback)
      const displayTitle = lesson?.title || course?.name || (session as any).planned_title || (session.method === 'livre' ? "Sessão Livre" : "Retomar sessão");
      const displayContext = lesson?.title && course?.name ? course.name : undefined;
      const displaySecondary = lesson && module ? `${module.name} · Aula ${lesson.position + 1}` : undefined;

      return {
        priority: "resume" as const,
        data: { 
          session,
          lesson,
          course,
          module,
          displayTitle,
          displayContext,
          displaySecondary
        },
      };
    }

    // 2. Prioridade: Revisão Urgente
    if (dueFlashcards && dueFlashcards.length > 0) {
      // Estimativa: 4 min a cada 1 pendente (exemplo heurístico sugerido "8 min para 2")
      const estimatedMinutes = Math.max(dueFlashcards.length * 4, 1);
      
      return {
        priority: "review" as const,
        data: { 
          count: dueFlashcards.length,
          estimatedMinutes
        },
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

  const hasActivity = (recentSessions?.length ?? 0) > 0;

  return { ...state, isLoading, dueFlashcards, courses, allLessons, modules, hasActivity };
}
