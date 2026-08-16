-- Hardening: funções privilegiadas não devem ser chamáveis pela API
REVOKE ALL ON FUNCTION public.apply_evidence_to_memory_state(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_memory_state_from_history(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_cognitive_evidence_insert() FROM PUBLIC, anon, authenticated;

-- search_path fixo na função auxiliar
CREATE OR REPLACE FUNCTION public.jsonb_text_array_within_length(p_array jsonb, p_max_length integer)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p_array) AS elem(value)
    WHERE length(elem.value) = 0 OR length(elem.value) > p_max_length
  );
$function$;