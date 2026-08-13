-- Adiciona a coluna is_free_session na tabela study_sessions
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS is_free_session BOOLEAN DEFAULT FALSE;

-- Garante acesso à API de Dados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
