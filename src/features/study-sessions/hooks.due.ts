import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDueReviews(limit = 20) {
  return useQuery({
    queryKey: ["due-reviews", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_states")
        .select(
          `
          *,
          concept:concepts (*)
        `,
        )
        .eq("is_test_data", false)
        .lte("due", new Date().toISOString())
        .order("due", { ascending: true })
        .order("difficulty", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Conceitos que nunca tiveram um memory_state (nunca foram testados nem
 * uma vez) — sem isto, um concept recém-criado (Escrita Livre) nunca
 * escapa do loop fechado memory_state inexistente -> nunca "due" -> nunca
 * selecionado por useDueReviews -> handleAssess nunca roda -> memory_state
 * nunca criado. "A memória nasce no teste, não na leitura"
 * (docs/DECISAO_MOTOR_MEMORIA.md) só é verdade na prática se o primeiro
 * teste tiver como acontecer. PostgREST não expressa anti-join
 * diretamente — duas buscas pequenas + diferença no cliente, mesmo padrão
 * de use-course-overview.ts.
 *
 * Molda cada item no formato que ReviewSession já espera de useDueReviews
 * (concept_id/concept/due), para entrar na mesma fila sem tratamento
 * especial.
 */
export function useNeverEvaluatedConcepts() {
  return useQuery({
    queryKey: ["never-evaluated-concepts"],
    queryFn: async () => {
      const [{ data: concepts, error: conceptsError }, { data: evaluated, error: evaluatedError }] =
        await Promise.all([
          supabase.from("concepts").select("*").eq("is_archived", false).eq("is_test_data", false),
          supabase.from("memory_states").select("concept_id").eq("is_test_data", false),
        ]);

      if (conceptsError) throw conceptsError;
      if (evaluatedError) throw evaluatedError;

      const evaluatedIds = new Set((evaluated ?? []).map((row) => row.concept_id));

      return (concepts ?? [])
        .filter((concept) => !evaluatedIds.has(concept.id))
        .map((concept) => ({
          concept_id: concept.id,
          concept,
          due: null,
        }));
    },
  });
}
