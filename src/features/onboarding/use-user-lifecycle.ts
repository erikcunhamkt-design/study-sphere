/**
 * USER LIFECYCLE — fonte central de "o usuário é novo?".
 *
 * A flag `onboarding_completed` pode ficar inconsistente com a realidade.
 * Por isso o ciclo de vida é derivado da ATIVIDADE REAL do usuário, e a
 * atividade sempre vence a flag (nunca o contrário).
 *
 * Regras (documentadas em docs/USER_LIFECYCLE.md):
 * - Conteúdo (cursos) NÃO conta como atividade: quem só adicionou conteúdo
 *   ainda não viveu a experiência principal e continua "novo".
 * - Dados de teste/auditoria (`is_test_data = true`) nunca contam.
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-preferences";

export type UserLifecycle = "new" | "onboarding" | "active";

export interface UserLifecycleResult {
  lifecycle: UserLifecycle;
  /** Possui histórico real de aprendizagem (sessão, evidência ou memória). */
  hasRealActivity: boolean;
  isNewUser: boolean;
  isLoading: boolean;
}

async function countReal(
  table: "study_sessions" | "cognitive_evidences" | "memory_states",
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or("is_test_data.is.null,is_test_data.eq.false")
    .limit(1);

  if (error) return 0;
  return count ?? 0;
}

export function useRealActivity() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["user-real-activity", user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const [sessions, evidences, memories] = await Promise.all([
        countReal("study_sessions", user!.id),
        countReal("cognitive_evidences", user!.id),
        countReal("memory_states", user!.id),
      ]);
      return {
        sessions,
        evidences,
        memories,
        hasRealActivity: sessions > 0 || evidences > 0 || memories > 0,
      };
    },
  });
}

export function useUserLifecycle(): UserLifecycleResult {
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: activity, isLoading: loadingActivity } = useRealActivity();

  const isLoading = loadingProfile || loadingActivity;
  const hasRealActivity = !!activity?.hasRealActivity;

  // Ciclo concluído / onboarding pulado também encerram a primeira experiência.
  const finishedByFlag =
    !!(profile as any)?.first_cycle_completed_at ||
    ((profile as any)?.onboarding_state === "skipped");

  const state = (profile as any)?.onboarding_state ?? "new_user";
  const startedOnboarding = state !== "new_user" && state !== "skipped";

  const lifecycle: UserLifecycle = hasRealActivity || finishedByFlag
    ? "active"
    : startedOnboarding
      ? "onboarding"
      : "new";

  return {
    lifecycle,
    hasRealActivity,
    isNewUser: !isLoading && lifecycle !== "active",
    isLoading,
  };
}
