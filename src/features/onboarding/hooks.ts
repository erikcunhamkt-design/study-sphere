import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-preferences";
import { isOnboardingDone, maxState } from "./types";
import type { OnboardingEvent, OnboardingState } from "./types";

export function useOnboarding() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useProfile();

  const rawState = ((profile as any)?.onboarding_state as OnboardingState) ?? "new_user";
  // Usuários antigos (anteriores a esta experiência) não devem ser reintroduzidos.
  const state: OnboardingState =
    rawState === "new_user" && profile?.onboarding_completed ? "skipped" : rawState;

  const track = useMutation({
    mutationFn: async (input: { event: OnboardingEvent; metadata?: Record<string, unknown> }) => {
      if (!user) return;
      await supabase.from("onboarding_events").insert({
        user_id: user.id,
        event: input.event,
        metadata: (input.metadata ?? {}) as any,
      });
    },
  });

  const advance = useMutation({
    mutationFn: async (next: OnboardingState) => {
      if (!user) return;
      // Nunca retrocede: retomada após abandono preserva o progresso.
      const target = maxState(state, next);
      if (target === state) return;

      const patch: Record<string, unknown> = { onboarding_state: target };
      if (target === "onboarding_started") patch.onboarding_started_at = new Date().toISOString();
      if (target === "first_cycle_completed") {
        patch.first_cycle_completed_at = new Date().toISOString();
        patch.onboarding_completed = true;
      }
      if (target === "skipped") patch.onboarding_completed = true;

      const { error } = await supabase.from("profiles").update(patch as any).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  /**
   * Avança o estado e registra o evento correspondente numa única chamada.
   * Idempotente: se o estado já passou por esse ponto (reload, nova tentativa),
   * nada é gravado — evita eventos duplicados.
   */
  async function reach(next: OnboardingState, event?: OnboardingEvent) {
    if (maxState(state, next) === state) return;
    try {
      await advance.mutateAsync(next);
      if (event) await track.mutateAsync({ event });
    } catch (err) {
      // Onboarding nunca pode quebrar o fluxo real de estudo.
      console.error("[onboarding] falha ao registrar progresso", err);
    }
  }

  return {
    state,
    isLoading,
    /** True enquanto o primeiro ciclo ainda não terminou (e não foi pulado). */
    isActive: !isLoading && !!user && !isOnboardingDone(state),
    reach,
    track: (event: OnboardingEvent, metadata?: Record<string, unknown>) =>
      track.mutateAsync({ event, metadata }).catch(() => undefined),
  };
}

/**
 * Próxima recuperação prevista para o conceito ligado a uma questão.
 * Consome o valor real calculado pelo FSRS (sem alterar o motor).
 */
export function useNextDueForQuestion(questionId: string | undefined) {
  return useQuery({
    enabled: !!questionId,
    queryKey: ["onboarding-next-due", questionId],
    queryFn: async (): Promise<string | null> => {
      const { data: question } = await supabase
        .from("questions")
        .select("concept_id")
        .eq("id", questionId!)
        .maybeSingle();

      if (!question?.concept_id) return null;

      const { data: memory } = await supabase
        .from("memory_states")
        .select("due")
        .eq("concept_id", question.concept_id)
        .maybeSingle();

      return (memory?.due as string | undefined) ?? null;
    },
  });
}

/** Texto amigável, sem prometer precisão: "amanhã", "em 3 dias"... */
export function formatNextDue(due: string | null | undefined): string | null {
  if (!due) return null;
  const target = new Date(due);
  if (Number.isNaN(target.getTime())) return null;

  const days = Math.round((target.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "ainda hoje";
  if (days === 1) return "amanhã";
  if (days < 30) return `em ${days} dias`;
  const months = Math.round(days / 30);
  return months <= 1 ? "em cerca de 1 mês" : `em cerca de ${months} meses`;
}

/**
 * Regra 2 da auditoria de UX: enquanto o bloco de boas-vindas está visível,
 * a Home não deve mostrar uma segunda ação primária concorrente.
 */
export function useOnboardingHomeVisible() {
  const { state, isActive } = useOnboarding();
  return (
    isActive &&
    (state === "new_user" || state === "onboarding_started" || state === "has_content")
  );
}
