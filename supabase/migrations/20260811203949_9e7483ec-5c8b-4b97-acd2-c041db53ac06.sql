-- Passo 2: Limpeza e Garantia de Estado (Escrita via migration)
-- Remover a função de teste se ainda existir
DROP FUNCTION IF EXISTS public.test_get_brain_state(uuid);

-- Remover grants extras da função real
REVOKE EXECUTE ON FUNCTION public.get_brain_state() FROM service_role;
REVOKE EXECUTE ON FUNCTION public.get_brain_state() FROM postgres;

-- Confirmar que authenticated mantém o EXECUTE
GRANT EXECUTE ON FUNCTION public.get_brain_state() TO authenticated;
