DO $$
DECLARE
    v_explain text;
BEGIN
    -- explain analyze insert...
    -- O supabase--migration executa em transação, mas retorna logs.
    -- Vamos tentar capturar o output se possível, ou apenas rodar para ver se o log de execução do Lovable mostra o tempo.
    EXECUTE 'EXPLAIN ANALYZE INSERT INTO public.study_sessions (user_id, method, details) VALUES (''d17f3791-b6a2-4a6e-b9b8-09edbe03b31f'', ''livre'', ''{}''::jsonb) RETURNING id';
END $$;