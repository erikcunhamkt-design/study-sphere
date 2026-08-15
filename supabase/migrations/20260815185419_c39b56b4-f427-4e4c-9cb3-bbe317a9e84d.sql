-- Desativar o trigger antigo que usava lógica V1 SQL
DROP TRIGGER IF EXISTS trigger_update_memory_on_evidence ON public.cognitive_evidences;

-- A lógica FSRS agora é controlada pela camada de aplicação (Memory Engine) via RPC applyFsrsReview.
-- Mantemos a função rebuild_memory_state_from_history para auditorias manuais se necessário.
