import { useMemo } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useInProgressStudySessions } from "@/features/study-sessions/hooks";
import { usePlannedStudiesInRange } from "@/features/planned-studies/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useAllCourseModules } from "@/features/studies/hooks/use-course-modules";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import { calculateCourseProgress } from "@/features/studies/utils";

export function useStudyState() {
  const { user } = useAuth();
  
  // Queries reais
  const { data: inProgressSessions, isLoading: loadingSessions } = useInProgressStudySessions();
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: allLessons, isLoading: loadingLessons } = useAllLessons();
  const { data: modules, isLoading: loadingModules } = useAllCourseModules();
  const { data: dueFlashcards, isLoading: loadingDue } = useDueFlashcards();
  const { data: areas, isLoading: loadingAreas } = useStudyAreas();
  
  // Planejamentos de hoje
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: plannedToday, isLoading: loadingPlanned } = usePlannedStudiesInRange(today, today);

  const isLoading = 
    loadingSessions || 
    loadingCourses || 
    loadingLessons || 
    loadingModules || 
    loadingPlanned ||
    loadingDue ||
    loadingAreas;

  const state = useMemo(() => {
    // 1. RESUME: Sessão ativa (sempre prioritária)
    const activeSession = inProgressSessions?.find(s => !s.ended_at && (!!s.lesson_id || s.is_free_session));
    
    if (activeSession) {
      const lesson = allLessons?.find(l => l.id === activeSession.lesson_id);
      const course = courses?.find(c => c.id === lesson?.course_id);
      
      return {
        priority: "resume" as const,
        data: {
          session: activeSession,
          lesson,
          course,
          title: lesson?.title || (activeSession.is_free_session ? "Sessão Livre" : "Sessão em andamento"),
          context: course?.name || (activeSession.is_free_session ? "Estudo Livre" : undefined)
        }
      };
    }

    if (isLoading) return { priority: "loading" as const, data: {} };

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

    // 3. START: Cursos disponíveis (em andamento primeiro, depois não iniciados)
    const availableCourses = (courses ?? [])
      .filter(c => !c.is_archived)
      .map(c => {
        const courseModules = (modules ?? []).filter(m => m.course_id === c.id);
        const courseLessons = (allLessons ?? []).filter(l => l.course_id === c.id);
        return {
          ...c,
          progress: calculateCourseProgress(courseModules, courseLessons)
        };
      })
      .filter(c => c.progress.lessonCount > 0) // Só mostra se tiver conteúdo real
      .sort((a, b) => {
        // Ordena: Em andamento primeiro, depois data de atualização
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    const recommendedCourse = availableCourses[0];

    if (recommendedCourse) {
      return {
        priority: "start" as const,
        data: {
          course: recommendedCourse,
          courses: availableCourses
        }
      };
    }

    // 4. ONBOARDING: Sem nada
    return { priority: "onboarding" as const, data: {} };

  }, [isLoading, inProgressSessions, plannedToday, courses, allLessons, modules]);

  return { ...state, isLoading, allCourses: courses ?? [] };
}
