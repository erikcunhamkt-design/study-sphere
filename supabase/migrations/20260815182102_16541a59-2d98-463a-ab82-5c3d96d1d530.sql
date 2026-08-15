-- Fase 06.2/07.1 — Material Real de Aula: Publicação e Progresso
-- Adiciona colunas para distinguir Rascunho de Publicado no caderno de aula.

-- =====================================================================
-- 1) Evolução de lesson_documents
-- =====================================================================

ALTER TABLE public.lesson_documents
  ADD COLUMN published_content JSONB,
  ADD COLUMN published_version INTEGER,
  ADD COLUMN published_at TIMESTAMPTZ,
  -- Check de integridade: published_content precisa ser um array se existir.
  ADD CONSTRAINT lesson_documents_published_content_check
    CHECK (published_content IS NULL OR jsonb_typeof(published_content) = 'array'),
  -- Limite de ~5 MB para o publicado também.
  ADD CONSTRAINT lesson_documents_published_content_size_check
    CHECK (published_content IS NULL OR octet_length(published_content::text) <= 5242880);

-- =====================================================================
-- 2) publish_lesson_document — Snapshot do rascunho para o publicado
-- =====================================================================
CREATE OR REPLACE FUNCTION public.publish_lesson_document(p_lesson_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_doc public.lesson_documents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.lesson_id = p_lesson_id AND d.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.lesson_documents
  SET published_content = content,
      published_version = version,
      published_at = now()
  WHERE id = v_doc.id;

  -- Gera um snapshot manual no histórico ao publicar
  PERFORM public.checkpoint_lesson_document(p_lesson_id);

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'published_version', v_doc.version,
    'published_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_lesson_document(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_lesson_document(UUID) TO authenticated;

COMMENT ON COLUMN public.lesson_documents.published_content IS 'Cópia imutável do material disponível para o estudante.';
COMMENT ON COLUMN public.lesson_documents.published_version IS 'Número da versão que foi publicada.';
COMMENT ON COLUMN public.lesson_documents.published_at IS 'Instante da última publicação.';
