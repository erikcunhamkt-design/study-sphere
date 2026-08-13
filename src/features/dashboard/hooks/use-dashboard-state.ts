import { useMemo } from "react";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { useInProgressStudySessions } from "@/features/study-sessions/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";

export function useDashboardState() {
  const { data: dueFlashcards } = useDueFlashcards();
  const { data: inProgressSessions } = useInProgressStudySessions();
  const { data: courses } = useAllCourses();
  const { data: allLessons } = useAllLessons();

  return useMemo(() => {
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

    // 3. Prioridade: Conteúdo Disponível (Não iniciado ou em dia)
    const activeCourses = (courses ?? []).filter(c => !c.is_archived);
    if (activeCourses.length > 0) {
        return {
            priority: "next_study" as const,
            data: { course: activeCourses[0] }
        }
    }

    // 4. Prioridade: Novo Usuário
    return { priority: "onboarding" as const, data: {} };
  }, [dueFlashcards, inProgressSessions, courses]);
}
