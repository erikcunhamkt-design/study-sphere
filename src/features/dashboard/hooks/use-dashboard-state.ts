import { useMemo } from "react";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { useInProgressStudySessions, useRecentStudySessions } from "@/features/study-sessions/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import { calculateCourseProgress } from "@/features/studies/utils";
import { useAllCourseModules } from "@/features/studies/hooks/use-course-modules";
import { useDueReviews } from "@/features/study-sessions/hooks.due";
import { isProductionEligible } from "@/lib/eligibility";

export function useDashboardState() {
  const { data: dueFlashcards, isLoading: loadingDue } = useDueFlashcards();
  const { data: dueConcepts, isLoading: loadingDueConcepts } = useDueReviews(50);
  const { data: inProgressSessions, isLoading: loadingProgress } = useInProgressStudySessions();
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: allLessons, isLoading: loadingLessons } = useAllLessons();
  const { data: areas, isLoading: loadingAreas } = useStudyAreas();
  const { data: modules, isLoading: loadingModules } = useAllCourseModules();
  const { data: recentSessions, isLoading: loadingRecent } = useRecentStudySessions(1);


  const isLoading =
    loadingDue ||
    loadingDueConcepts ||
    loadingProgress ||
    loadingCourses ||
    loadingLessons ||
    loadingAreas ||
    loadingModules ||
    loadingRecent;


  const hasActivity = (recentSessions?.length ?? 0) > 0;
  
  const state = useMemo(() => {
    if (isLoading) return { priority: "loading" as const, data: {} };

    // 1. Prioridade: Conteúdo Interrompido (Sessão em andamento)
    if (inProgressSessions && inProgressSessions.length > 0) {
      // Filtrar sessões válidas para a Home
      const validSessions = inProgressSessions.filter(s => {
        if (s.ended_at) return false;

        // Isolar dados de teste através da flag estrutural
        if (!isProductionEligible(s)) return false;

        // Abandono por tempo (ex: 4 horas de inatividade)
        const lastUpdate = new Date(s.updated_at).getTime();
        const fourHours = 4 * 60 * 60 * 1000;
        if (Date.now() - lastUpdate > fourHours) return false;

        // Sessão de conteúdo real
        if (s.lesson_id) {
          const lesson = allLessons?.find(l => l.id === s.lesson_id);
          if (lesson && !isProductionEligible(lesson)) return false;
          return !!lesson;
        }
        
        // Sessão livre intencional
        if (s.is_free_session) return true;

        return false;
      });

      if (validSessions.length > 0) {
        const session = validSessions[0];
        const lesson = allLessons?.find(l => l.id === session.lesson_id);
        const course = courses?.find(c => c.id === lesson?.course_id);
        const module = modules?.find(m => m.id === lesson?.module_id);

        // Tentar encontrar título real (preferência: Lesson -> Course -> Planned Title -> Fallback)
        let displayTitle = lesson?.title || course?.name || (session as any).planned_title;
        
        if (!displayTitle) {
          if (session.is_free_session) {
            displayTitle = "Sessão Livre";
          } else {
            // Último caso: se chegamos aqui, algo está errado, mas usamos o fallback seguro
            displayTitle = "Retomar sessão";
          }
        }

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
            displaySecondary,
            isFree: session.is_free_session && !session.lesson_id
          },
        };
      }
    }

    // 2. Prioridade: Revisão Urgente (Flashcards + Conceitos FSRS)
    const totalDue = (dueFlashcards?.length ?? 0) + (dueConcepts?.length ?? 0);
    if (totalDue > 0) {
      // Estimativa baseada no volume total de revisão
      const estimatedMinutes = Math.max(totalDue * 3, 1);
      
      return {
        priority: "review" as const,
        data: { 
          count: totalDue,
          estimatedMinutes
        },
      };
    }


    // 3. Prioridade: Recomendação (Cursos em andamento)
    const activeCourses = (courses ?? []).filter((c) => !c.is_archived);
    const inProgressCourses = activeCourses.filter((c) => 
      c.status === "in_progress" && isProductionEligible(c)
    );

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
    const validCourses = (activeCourses ?? []).filter(c => 
      c.name.trim().length > 2 && isProductionEligible(c)
    );

    if (validCourses.length > 0) {
      // Verificar se já houve algum estudo (mesmo que não esteja em andamento agora)
      if (hasActivity) {
        return {
          priority: "maintenance" as const,
          data: { course: validCourses[0] }
        };
      }

      return {
        priority: "start_study" as const,
        data: { course: validCourses[0] },
      };
    }

    // 5. Prioridade: Onboarding (Sem conteúdo)
    return { priority: "onboarding" as const, data: {} };
  }, [isLoading, dueFlashcards, dueConcepts, inProgressSessions, courses, allLessons, areas, modules, hasActivity]);

  return { ...state, isLoading, dueFlashcards, dueConcepts, courses, allLessons, modules, hasActivity };
}
