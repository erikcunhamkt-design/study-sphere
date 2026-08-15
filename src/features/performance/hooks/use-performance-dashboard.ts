import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-preferences";
import { mapToHumanState, checkMetacognitiveMismatch } from "../utils/memory-interpretation";
import type { RecallResult } from "@/features/study-sessions/types";
import { startOfDayIso } from "@/lib/timezone";

export function usePerformanceDashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    enabled: !!user,
    queryKey: ["performance-dashboard", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // 1. Fetch Concepts + Memory States
      const { data: memoryStates, error: msError } = await supabase
        .from("memory_states")
        .select(`
          *,
          concept:concepts (*)
        `)
        .eq("user_id", user.id)
        .eq("is_test_data", false);

      if (msError) throw msError;

      // 2. Fetch Recent Cognitive Evidences
      const { data: evidences, error: evError } = await supabase
        .from("cognitive_evidences")
        .select(`
          *,
          concept:concepts (*)
        `)
        .eq("user_id", user.id)
        .eq("is_test_data", false)
        .order("attempted_at", { ascending: false })
        .limit(20);

      if (evError) throw evError;

      // 3. Fetch Study Sessions for activity counts
      const { data: sessions, error: sError } = await supabase
        .from("study_sessions")
        .select("id, duration_seconds, ended_at, started_at")
        .eq("user_id", user.id)
        .eq("is_test_data", false)
        .not("ended_at", "is", null);

      if (sError) throw sError;

      // Process memory states
      const now = new Date();
      const interpretedConcepts = (memoryStates || []).map(ms => {
        const isDue = ms.due ? new Date(ms.due) <= now : false;
        const humanState = mapToHumanState({
          reps: ms.reps || 0,
          stability: ms.stability || 0,
          difficulty: ms.difficulty || 0,
          lastResult: ms.last_result as RecallResult,
          lapses: ms.lapses || 0,
          isDue
        });

        const hasMismatch = checkMetacognitiveMismatch(ms.last_confidence, ms.last_result as RecallResult);

        return {
          ...ms,
          humanState,
          isDue,
          hasMismatch,
          concept: ms.concept
        };
      });

      // Aggregate Summary
      const summary = {
        totalConcepts: interpretedConcepts.length,
        evaluatedMemories: interpretedConcepts.filter(c => (c.reps || 0) > 0).length,
        dueReviews: interpretedConcepts.filter(c => c.isDue).length,
        inDayReviews: interpretedConcepts.filter(c => (c.reps || 0) > 0 && !c.isDue).length,
      };

      // Attention Section
      const attentionNeeded = interpretedConcepts
        .filter(c => c.humanState.state === "reforco" || c.hasMismatch || c.isDue)
        .sort((a, b) => {
          if (a.hasMismatch && !b.hasMismatch) return -1;
          if (!a.hasMismatch && b.hasMismatch) return 1;
          if (a.isDue && !b.isDue) return -1;
          return 0;
        })
        .slice(0, 5);

      // Future Reviews Breakdown
      const tz = profile?.timezone;
      const today = startOfDayIso(tz, now);
      
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = startOfDayIso(tz, tomorrowDate);
      
      const next7DaysLimit = new Date(now);
      next7DaysLimit.setDate(next7DaysLimit.getDate() + 7);
      const next7Days = startOfDayIso(tz, next7DaysLimit);

      const futureReviews = {
        today: interpretedConcepts.filter(c => c.due && c.due <= today).length,
        tomorrow: interpretedConcepts.filter(c => c.due && c.due > today && c.due <= tomorrow).length,
        next7Days: interpretedConcepts.filter(c => c.due && c.due > today && c.due <= next7Days).length,
      };

      // Study Progress
      const totalTimeSeconds = (sessions || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const studyProgress = {
        totalTimeMinutes: Math.floor(totalTimeSeconds / 60),
        completedSessions: sessions.length,
        startedConcepts: interpretedConcepts.length,
        completedConcepts: interpretedConcepts.filter(c => (c.stability || 0) > 10).length,
      };

      return {
        concepts: interpretedConcepts,
        evidences,
        summary,
        attentionNeeded,
        futureReviews,
        studyProgress,
        hasData: interpretedConcepts.length > 0 || sessions.length > 0,
        hasEvaluations: interpretedConcepts.some(c => (c.reps || 0) > 0)
      };
    }
  });
}
