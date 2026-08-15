-- Adiciona published_version na tabela study_sessions para rastrear qual versão do material foi estudada
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS published_version INTEGER;

-- Comentário para documentação
COMMENT ON COLUMN public.study_sessions.published_version IS 'Rastreia a versão publicada do documento da aula no momento em que a sessão foi iniciada.';

-- Grant para garantir acesso (authenticated já deve ter acesso geral, mas reforçamos o campo se necessário)
-- GRANT UPDATE(published_version) ON public.study_sessions TO authenticated;