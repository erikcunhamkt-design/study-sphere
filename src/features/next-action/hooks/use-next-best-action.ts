
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
      // Regra 5: Sessão concluída não pode aparecer como resume
      if (s.ended_at) return false;
      // Regra 6 & 25: Ignorar dados de teste
      if (!isProductionEligible(s)) return false;
      
      // Regra 1: Abandono por tempo (4h) usando updated_at
      const lastUpdate = new Date(s.updated_at);
      if (differenceInMinutes(now, lastUpdate) > 240) return false;
      
      return true;
    });

    if (validInProgress && validInProgress.length > 0) {
      const session = validInProgress[0];
      const lesson = allLessons?.find(l => l.id === session.lesson_id);
      
      // Regra 25 & 26: Verificar ownership e material (isProductionEligible no lesson)
      if (lesson && isProductionEligible(lesson)) {
        const course = courses?.find(c => c.id === lesson.course_id);
        
        if (course && isProductionEligible(course)) {
          const title = lesson.title || (session as any).planned_title || "Sessão em andamento";
          const diffMin = differenceInMinutes(now, new Date(session.updated_at));
          const timeAgo = diffMin === 0 ? "agora mesmo" : `${diffMin} minuto${diffMin > 1 ? 's' : ''}`;

          actions.push({
            type: 'resume',
            priority: WEIGHTS.RESUME,
            urgency: 1.0,
            title: `Retomar: ${title}`,
            description: course.name || "Continuar de onde parou",
            reason: formatReason('resume', { title, timeAgo }),
            cta: "Continuar agora",
            targetId: session.id,
            targetType: 'session',
            metadata: { session, lesson, course }
          });
        }
      }
    }

    // --- P1: REVIEW_DUE ---
    const dueConcepts = dashboard?.concepts?.filter(c => c.isDue && !(c as any).is_archived) || [];
    const dueCount = dueConcepts.length;
    
    if (dueCount > 0) {
      // Regra 2 & 11: Urgência dinâmica baseada no atraso
      // Encontrar o conceito mais atrasado
      const mostDelayed = dueConcepts.reduce((prev, curr) => {
        if (!prev.due) return curr;
        if (!curr.due) return prev;
        return new Date(curr.due) < new Date(prev.due) ? curr : prev;
      });
      
      const delayDays = mostDelayed.due 
        ? Math.max(0, Math.floor((now.getTime() - new Date(mostDelayed.due).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      // Score de urgência P1: base 0.5 + bônus por volume e atraso
      // Se delayDays > 7, urgência escala rápido
      const urgency = Math.min(0.5 + (dueCount * 0.05) + (delayDays * 0.02), 0.95);
      
      actions.push({
        type: 'review',
        priority: WEIGHTS.REVIEW,
        urgency,
        title: "Revisão Necessária",
        description: `${dueCount} conceito${dueCount > 1 ? 's aguardam' : ' aguarda'} sua recuperação.`,
        reason: formatReason('review', { count: dueCount, delayDays }),
        cta: "Revisar agora",
        targetType: 'review',
        metadata: { count: dueCount, delayDays }
      });
    }

    // --- P2: REINFORCE (Attention Needed) ---
    const attentionList = dashboard?.attentionNeeded?.filter(a => isProductionEligible(a.concept as any) && !(a.concept as any).is_archived) || [];
    const attention = attentionList[0];
    
    if (attention) {
      // Regra 2: Reinforce só vence se a urgência for crítica
      const hasMismatch = (attention as any).hasMismatch;
      const urgency = hasMismatch ? 0.92 : 0.7; // Mismatch é crítico

      actions.push({
        type: 'reinforce',
        priority: WEIGHTS.REINFORCE,
        urgency,
        title: `Reforçar: ${attention.concept.title}`,
        description: "Este conceito precisa de atenção especial.",
        reason: formatReason('reinforce', { hasMismatch }),
        cta: "Reforçar conceito",
        targetId: attention.concept_id,
        targetType: 'concept',
        metadata: { attention }
      });
    }

    // --- P3: TEST_MEMORY (Estudou mas reps=0) ---
    // Regra 12: Test memory é importante após primeiro contato
    const hasStudyButNoEval = (dashboard?.summary?.totalConcepts ?? 0) > 0 && (dashboard?.summary?.evaluatedMemories ?? 0) === 0;
    if (hasStudyButNoEval) {
      actions.push({
        type: 'test_memory',
        priority: WEIGHTS.TEST_MEMORY,
        urgency: 0.65,
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
      // Regra 14 & 15: Só recomendar first_study se houver curso
      const firstCourse = activeCourses[0];
      actions.push({
        type: 'first_study',
        priority: WEIGHTS.FIRST_STUDY,
        urgency: 0.45,
        title: "Começar Primeiro Estudo",
        description: `Inicie sua jornada em ${firstCourse.name}.`,
        reason: formatReason('first_study', { title: firstCourse.name }),
        cta: "Começar agora",
        targetId: firstCourse.id,
        targetType: 'course'
      });
    }

    // --- P7: ADD_CONTENT ---
    // Regra 15: Novo usuário sem conteúdo
    if (activeCourses.length === 0 && !isLoading) {
      actions.push({
        type: 'add_content',
        priority: WEIGHTS.ADD_CONTENT,
        urgency: 0.3,
        title: "Adicionar Conteúdo",
        description: "Para começar, você precisa de uma área de estudo.",
        reason: formatReason('add_content', {}),
        cta: "Adicionar área",
        targetType: 'course'
      });
    }

    // --- Fallback: ALL_CLEAR ---
    // Regra 17: Tudo em dia
    if (actions.length === 0 || (actions.length === 1 && actions[0].type === 'add_content' && activeCourses.length > 0)) {
       // Se caímos aqui e temos cursos, mas nada urgente
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

    // Regra 18 & 30: Determinismo e Ação Única Principal
    // Ordenar por prioridade real e depois urgência
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
