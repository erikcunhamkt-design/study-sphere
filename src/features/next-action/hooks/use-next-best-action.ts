
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { useInProgressStudySessions, useRecentStudySessions } from "@/features/study-sessions/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import { usePerformanceDashboard } from "@/features/performance/hooks/use-performance-dashboard";
import { isProductionEligible } from "@/lib/eligibility";
import { NextAction, NextActionRecommendation, NextActionType } from "../types";
import { WEIGHTS, formatReason } from "../utils/engine-utils";
import { differenceInMinutes } from "date-fns";

export function useNextBestAction(): NextActionRecommendation {
  const { user } = useAuth();
  
  // Queries centrais (reutilizando cache do TanStack Query)
  const { data: inProgressSessions, isLoading: loadingProgress } = useInProgressStudySessions();
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: allLessons, isLoading: loadingLessons } = useAllLessons();
  const { data: recentSessions, isLoading: loadingRecent } = useRecentStudySessions(1);
  const { data: dashboard, isLoading: loadingDashboard } = usePerformanceDashboard();
  
  const isLoading = loadingProgress || loadingCourses || loadingLessons || loadingRecent || loadingDashboard;

  const recommendation = useMemo((): NextActionRecommendation => {
    const actions: NextAction[] = [];

    if (isLoading || !user) {
      return {
        primary: {
          type: 'all_clear',
          priority: WEIGHTS.ALL_CLEAR,
          urgency: 0,
          title: "Carregando...",
          description: "Analisando seu progresso...",
          reason: "",
          cta: "Aguarde"
        },
        secondary: [],
        isLoading: true
      };
    }

    const now = new Date();

    // --- P0: RESUME_SESSION ---
    const validInProgress = inProgressSessions?.filter(s => {
      if (s.ended_at) return false;
      if (!isProductionEligible(s)) return false;
      
      // Abandono por tempo (4h)
      const lastUpdate = new Date(s.updated_at);
      if (differenceInMinutes(now, lastUpdate) > 240) return false;
      
      return true;
    });

    if (validInProgress && validInProgress.length > 0) {
      const session = validInProgress[0];
      const lesson = allLessons?.find(l => l.id === session.lesson_id);
      const course = courses?.find(c => c.id === lesson?.course_id);
      
      const title = lesson?.title || (session as any).planned_title || "Sessão em andamento";
      const timeAgo = `${differenceInMinutes(now, new Date(session.updated_at))} minutos`;

      actions.push({
        type: 'resume',
        priority: WEIGHTS.RESUME,
        urgency: 1.0,
        title: `Retomar: ${title}`,
        description: course?.name || "Continuar de onde parou",
        reason: formatReason('resume', { title, timeAgo }),
        cta: "Continuar agora",
        targetId: session.id,
        targetType: 'session',
        metadata: { session, lesson, course }
      });
    }

    // --- P1: REVIEW_DUE ---
    const dueCount = dashboard?.summary.dueReviews || 0;
    if (dueCount > 0) {
      // Urgência baseada no volume e possivelmente no atraso (simplificado por enquanto)
      const urgency = Math.min(0.5 + (dueCount * 0.1), 1.0);
      
      actions.push({
        type: 'review',
        priority: WEIGHTS.REVIEW,
        urgency,
        title: "Revisão Necessária",
        description: `${dueCount} conceito${dueCount > 1 ? 's aguardam' : ' aguarda'} sua recuperação.`,
        reason: formatReason('review', { count: dueCount }),
        cta: "Revisar agora",
        targetType: 'review',
        metadata: { count: dueCount }
      });
    }

    // --- P2: REINFORCE (Attention Needed) ---
    const attention = dashboard?.attentionNeeded?.[0];
    if (attention) {
      actions.push({
        type: 'reinforce',
        priority: WEIGHTS.REINFORCE,
        urgency: 0.7,
        title: `Reforçar: ${attention.concept.title}`,
        description: "Este conceito precisa de atenção especial.",
        reason: formatReason('reinforce', {}),
        cta: "Reforçar conceito",
        targetId: attention.concept_id,
        targetType: 'concept',
        metadata: { attention }
      });
    }

    // --- P3: TEST_MEMORY (Estudou mas reps=0) ---
    const hasStudyButNoEval = (dashboard?.summary?.totalConcepts ?? 0) > 0 && (dashboard?.summary?.evaluatedMemories ?? 0) === 0;
    if (hasStudyButNoEval) {
      actions.push({
        type: 'test_memory',
        priority: WEIGHTS.TEST_MEMORY,
        urgency: 0.6,
        title: "Testar sua Memória",
        description: "Avalie o que você aprendeu nas últimas sessões.",
        reason: formatReason('test_memory', {}),
        cta: "Começar teste",
        targetType: 'review'
      });
    }

    // --- P4/P5: CONTINUE / FIRST_STUDY ---
    const activeCourses = (courses ?? []).filter(c => !c.is_archived && isProductionEligible(c));
    const inProgressCourse = activeCourses.find(c => c.status === 'in_progress');
    
    if (inProgressCourse) {
      actions.push({
        type: 'continue',
        priority: WEIGHTS.CONTINUE,
        urgency: 0.5,
        title: `Continuar: ${inProgressCourse.name}`,
        description: "Mantenha o ritmo no seu aprendizado.",
        reason: formatReason('continue', { title: inProgressCourse.name }),
        cta: "Continuar curso",
        targetId: inProgressCourse.id,
        targetType: 'course'
      });
    } else if (activeCourses.length > 0) {
      const firstCourse = activeCourses[0];
      actions.push({
        type: 'first_study',
        priority: WEIGHTS.FIRST_STUDY,
        urgency: 0.4,
        title: "Começar Primeiro Estudo",
        description: `Inicie sua jornada em ${firstCourse.name}.`,
        reason: formatReason('first_study', {}),
        cta: "Começar agora",
        targetId: firstCourse.id,
        targetType: 'course'
      });
    }

    // --- P7: ADD_CONTENT ---
    if (activeCourses.length === 0 && !isLoading) {
      actions.push({
        type: 'add_content',
        priority: WEIGHTS.ADD_CONTENT,
        urgency: 0.3,
        title: "Adicionar Conteúdo",
        description: "Você ainda não tem áreas de estudo cadastradas.",
        reason: formatReason('add_content', {}),
        cta: "Adicionar área",
        targetType: 'course'
      });
    }

    // --- Fallback: ALL_CLEAR ---
    if (actions.length === 0) {
      actions.push({
        type: 'all_clear',
        priority: WEIGHTS.ALL_CLEAR,
        urgency: 0.1,
        title: "Tudo em Dia",
        description: "Você completou todas as ações sugeridas.",
        reason: formatReason('all_clear', {}),
        cta: "Explorar mais"
      });
    }

    // Ordenar por prioridade real e urgência
    // P0 sempre ganha. Para outros, urgência pode influenciar se for muito alta.
    const sortedActions = [...actions].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.urgency - a.urgency;
    });

    return {
      primary: sortedActions[0],
      secondary: sortedActions.slice(1, 4),
      isLoading: false
    };
  }, [user, isLoading, inProgressSessions, courses, allLessons, recentSessions, dashboard]);

  return recommendation;
}
