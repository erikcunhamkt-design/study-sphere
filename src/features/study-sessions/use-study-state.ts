import { useMemo } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useInProgressStudySessions } from "@/features/study-sessions/hooks";
import { usePlannedStudiesInRange } from "@/features/planned-studies/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useAllCourseModules } from "@/features/studies/hooks/use-course-modules";
import { calculateCourseProgress } from "@/features/studies/utils";

export function useStudyState() {
  const { user } = useAuth();
  
  // Queries reais
  const { data: inProgressSessions, isLoading: loadingSessions } = useInProgressStudySessions();
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: allLessons, isLoading: loadingLessons } = useAllLessons();
  const { data: modules, isLoading: loadingModules } = useAllCourseModules();
  
  // Planejamentos de hoje
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: plannedToday, isLoading: loadingPlanned } = usePlannedStudiesInRange(today, today);

  const isLoading = loadingSessions || loadingCourses || loadingLessons || loadingModules || loadingPlanned;

  const state = useMemo(() => {
    if (isLoading) return { priority: "loading" as const, data: {} };

    // 1. RESUME: Sessão ativa
    const activeSession = inProgressSessions?.find(s => !s.ended_at);
    if (activeSession) {
      const lesson = allLessons?.find(l => l.id === activeSession.lesson_id);
      const course = courses?.find(c => c.id === lesson?.course_id);
      
      return {
        priority: "resume" as const,
        data: {
          session: activeSession,
          lesson,
          course,
          title: lesson?.title || "Sessão em andamento",
          context: course?.name || "Estudo livre"
        }
      };
    }

    // 2. RECOMMENDATION: Próximo passo planejado (não concluído)
    const nextPlanned = plannedToday?.find(p => p.status === "planned");
    if (nextPlanned) {
      return {
        priority: "recommendation" as const,
        data: {
          planned: nextPlanned,
          title: nextPlanned.title,
          estimatedMinutes: nextPlanned.estimated_minutes || 0
        }
      };
    }

    // 3. CONTINUAR: Cursos em andamento
    const inProgressCourses = (courses ?? [])
      .filter(c => !c.is_archived && c.status === "in_progress")
      .map(c => {
        const courseModules = (modules ?? []).filter(m => m.course_id === c.id);
        const courseLessons = (allLessons ?? []).filter(l => l.course_id === c.id);
        return {
          ...c,
          progress: calculateCourseProgress(courseModules, courseLessons)
        };
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    if (inProgressCourses.length > 0) {
      return {
        priority: "continue" as const,
        data: {
          courses: inProgressCourses
        }
      };
    }

    // 4. START: Cursos disponíveis mas não iniciados
    const availableCourses = (courses ?? [])
      .filter(c => !c.is_archived && c.status === "not_started");

    if (availableCourses.length > 0) {
      return {
        priority: "start" as const,
        data: {
          courses: availableCourses
        }
      };
    }

    // 5. ONBOARDING: Sem nada
    return { priority: "onboarding" as const, data: {} };

  }, [isLoading, inProgressSessions, plannedToday, courses, allLessons, modules]);

  return { ...state, isLoading, allCourses: courses ?? [] };
}
