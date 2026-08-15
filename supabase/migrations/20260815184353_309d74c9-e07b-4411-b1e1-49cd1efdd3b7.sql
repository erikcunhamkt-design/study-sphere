-- Proteção de Funções SECURITY DEFINER

-- 1. Restringir apply_evidence_to_memory_state
REVOKE ALL ON FUNCTION public.apply_evidence_to_memory_state(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_evidence_to_memory_state(UUID, UUID) TO authenticated;

-- 2. Restringir on_cognitive_evidence_insert
REVOKE ALL ON FUNCTION public.on_cognitive_evidence_insert() FROM PUBLIC;
-- Triggers rodam como o dono da função, mas revogar EXECUTE de public é boa prática

-- 3. Garantir search_path em funções existentes da V1.1/V1.2 que podem ter falhado no linter
-- record_recall_attempt já tem search_path = public
-- apply_evidence_to_memory_state já tem search_path = public
-- on_cognitive_evidence_insert já tem search_path = public
