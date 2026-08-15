import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDueReviews } from "./hooks.due";

export type ReviewSemanticState = "loading" | "due" | "new_user" | "no_recovery" | "no_due";

export function useReviewSemanticState() {
  const { data: dueReviews, isLoading: isLoadingDue } = useDueReviews(50);
  
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["review-semantic-stats"],
    queryFn: async () => {
      // 1. Check for memory states
      const { count: memoryStatesCount, error: msError } = await supabase
        .from("memory_states")
        .select("*", { count: "exact", head: true })
        .eq("is_test_data", false);

      if (msError) throw msError;

      // 2. Check for study sessions (activity)
      const { count: sessionsCount, error: sError } = await supabase
        .from("study_sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_test_data", false)
        .not("ended_at", "is", null);

      if (sError) throw sError;

      // 3. Check for cognitive evidences
      const { count: evidencesCount, error: eError } = await supabase
        .from("cognitive_evidences")
        .select("*", { count: "exact", head: true })
        .eq("is_test_data", false);

      if (eError) throw eError;

      return {
        memoryStatesCount: memoryStatesCount || 0,
        sessionsCount: sessionsCount || 0,
        evidencesCount: evidencesCount || 0,
      };
    },
  });

  const isLoading = isLoadingDue || isLoadingStats;

  if (isLoading) return { state: "loading" as ReviewSemanticState, dueReviews: [], isLoading: true };

  if (dueReviews && dueReviews.length > 0) {
    return { state: "due" as ReviewSemanticState, dueReviews, isLoading: false };
  }

  // Usuário Novo: Sem estudo e sem memória
  if ((stats?.sessionsCount || 0) === 0 && (stats?.memoryStatesCount || 0) === 0) {
    return { state: "new_user" as ReviewSemanticState, dueReviews: [], isLoading: false };
  }

  // Estudou, mas não recuperou (Sem evidências ou sem estados de memória derivados)
  if ((stats?.evidencesCount || 0) === 0 || (stats?.memoryStatesCount || 0) === 0) {
    return { state: "no_recovery" as ReviewSemanticState, dueReviews: [], isLoading: false };
  }

  // Memória existe, nada devido
  return { state: "no_due" as ReviewSemanticState, dueReviews: [], isLoading: false };
}
