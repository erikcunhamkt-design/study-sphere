-- Curso V1 — Escrita livre: permite um lesson_documents pertencer
-- diretamente a um curso (course_id) em vez de uma aula (lesson_id).
--
-- Reaproveita a MESMA tabela, o MESMO versionamento otimista, o MESMO
-- histórico e as MESMAS 4 RPCs já existentes (save/checkpoint/restore/
-- publish) — não cria um tipo de conteúdo novo, apenas um segundo anexo
-- possível para o mesmo documento. Nunca cria Lesson, Concept ou Memory
-- State: nenhuma leitura de progresso/FSRS consulta lesson_documents por
-- course_id (elas filtram por lesson_id), então um documento de curso
-- nunca entra no cálculo de progresso de aulas, nem em recomendações do
-- Next Action Engine.
--
-- Migration nova e incremental: não remove/recria tabelas, não enfraquece
-- nenhuma policy/constraint/grant já existente. lesson_id deixa de ser
-- NOT NULL (única alteração destrutiva-em-aparência, mas sem perda de
-- dados: toda linha existente já tem lesson_id preenchido).

-- =====================================================================
-- 1) lesson_id vira opcional; course_id é a âncora alternativa.
-- =====================================================================

ALTER TABLE public.lesson_documents
  ALTER COLUMN lesson_id DROP NOT NULL;

ALTER TABLE public.lesson_documents
  ADD COLUMN course_id UUID NULL;

-- Exatamente um dos dois anexos — nunca os dois, nunca nenhum.
ALTER TABLE public.lesson_documents
  ADD CONSTRAINT lesson_documents_exactly_one_anchor_check
  CHECK ((lesson_id IS NOT NULL) <> (course_id IS NOT NULL));

-- Mesma proteção multi-tenant já usada para lesson_id: o documento só pode
-- apontar para um curso do MESMO user_id (courses_id_user_id_key já existe
-- desde a Fase 02.2/06.1).
ALTER TABLE public.lesson_documents
  ADD CONSTRAINT lesson_documents_course_user_fkey
  FOREIGN KEY (course_id, user_id)
  REFERENCES public.courses(id, user_id)
  ON DELETE CASCADE;

-- Um único documento de escrita livre por curso e usuário — mesmo padrão
-- 1:1 já usado para lesson_id. Índice parcial porque a UNIQUE(lesson_id,
-- user_id) existente não cobre course_id, e um índice UNIQUE comum sobre
-- (course_id, user_id) permitiria múltiplas linhas com ambos NULL (não é
-- o caso aqui, já que o CHECK acima proíbe course_id NULL em linha alguma
-- que não seja de aula — mas o WHERE deixa a intenção explícita e evita
-- indexar linhas de aula à toa).
CREATE UNIQUE INDEX lesson_documents_course_id_user_id_key
  ON public.lesson_documents (course_id, user_id)
  WHERE course_id IS NOT NULL;

-- =====================================================================
-- 2) Trigger de imutabilidade: agora também trava course_id, e troca a
-- comparação para IS DISTINCT FROM (a versão anterior usava <>, que com
-- as duas colunas agora nullable deixaria de barrar corretamente).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enforce_lesson_document_versioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.user_id <> OLD.user_id
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id THEN
    RAISE EXCEPTION 'id, user_id, lesson_id e course_id do documento são imutáveis'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.version <> OLD.version AND NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'A versão do documento só pode permanecer igual ou avançar exatamente 1 (atual %, recebida %)',
      OLD.version, NEW.version
      USING ERRCODE = '22023';
  END IF;

  IF (NEW.content IS DISTINCT FROM OLD.content
      OR NEW.schema_version IS DISTINCT FROM OLD.schema_version)
     AND NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Alterar o conteúdo exige incrementar a versão em exatamente 1 (atual %, recebida %)',
      OLD.version, NEW.version
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- 3) RPCs — as 4 funções ganham p_course_id (trailing, default NULL).
-- DROP + CREATE (não apenas CREATE OR REPLACE) porque estamos adicionando
-- parâmetro: com o mesmo nome e um parâmetro a mais a assinatura muda, e
-- CREATE OR REPLACE sozinho criaria uma segunda função sobrecarregada em
-- vez de substituir — o DROP garante que continua existindo exatamente
-- uma função com este nome.
-- =====================================================================

DROP FUNCTION IF EXISTS public.save_lesson_document(UUID, JSONB, INTEGER, INTEGER);

CREATE FUNCTION public.save_lesson_document(
  p_lesson_id UUID,
  p_content JSONB,
  p_schema_version INTEGER,
  p_expected_version INTEGER,
  p_course_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_doc public.lesson_documents%ROWTYPE;
  v_new_id UUID;
  v_last_snapshot_at TIMESTAMPTZ;
  v_snapshot_created BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF (p_lesson_id IS NOT NULL) = (p_course_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Informe exatamente um entre p_lesson_id e p_course_id' USING ERRCODE = '22023';
  END IF;

  IF p_content IS NULL OR jsonb_typeof(p_content) <> 'array' THEN
    RAISE EXCEPTION 'O conteúdo do documento precisa ser um array JSON' USING ERRCODE = '22023';
  END IF;

  IF p_schema_version IS NULL OR p_schema_version < 1 THEN
    RAISE EXCEPTION 'schema_version inválido' USING ERRCODE = '22023';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version < 0 THEN
    RAISE EXCEPTION 'expected_version inválido' USING ERRCODE = '22023';
  END IF;

  IF p_lesson_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE id = p_lesson_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Aula não encontrada para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_course_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.courses WHERE id = p_course_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Curso não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  -- Nunca espera o lock da linha indefinidamente (ver migration
  -- 20260727130000 — sem isto, uma transação presa travaria toda chamada
  -- seguinte a este documento, sem timeout, sem erro).
  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.user_id = auth.uid()
    AND d.lesson_id IS NOT DISTINCT FROM p_lesson_id
    AND d.course_id IS NOT DISTINCT FROM p_course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN
      -- ERRCODE customizado 'VC409' (não 40001): ver migration
      -- 20260729210000 — 40001 é interpretado como "re-execute a
      -- transação" pelo PostgREST/pooler, e a resposta de conflito nunca
      -- chegava ao cliente.
      RAISE EXCEPTION 'Conflito de versão: o documento esperado (versão %) não existe', p_expected_version
        USING ERRCODE = 'VC409';
    END IF;

    BEGIN
      INSERT INTO public.lesson_documents (user_id, lesson_id, course_id, content, schema_version, version)
      VALUES (auth.uid(), p_lesson_id, p_course_id, p_content, p_schema_version, 1)
      RETURNING id INTO v_new_id;
    EXCEPTION WHEN unique_violation THEN
      -- Outra aba/sessão criou o documento entre o SELECT e o INSERT.
      RAISE EXCEPTION 'Conflito de versão: o documento acabou de ser criado em outra sessão'
        USING ERRCODE = 'VC409';
    END;

    RETURN jsonb_build_object(
      'document_id', v_new_id,
      'version', 1,
      'snapshot_created', false
    );
  END IF;

  IF v_doc.version <> p_expected_version THEN
    RAISE EXCEPTION 'Conflito de versão: esperada %, atual %', p_expected_version, v_doc.version
      USING ERRCODE = 'VC409';
  END IF;

  IF v_doc.content = p_content AND v_doc.schema_version = p_schema_version THEN
    RETURN jsonb_build_object(
      'document_id', v_doc.id,
      'version', v_doc.version,
      'snapshot_created', false
    );
  END IF;

  SELECT max(v.created_at) INTO v_last_snapshot_at
  FROM public.lesson_document_versions v
  WHERE v.document_id = v_doc.id;

  IF (v_last_snapshot_at IS NULL OR now() - v_last_snapshot_at >= interval '5 minutes')
     AND NOT EXISTS (
       SELECT 1 FROM public.lesson_document_versions v
       WHERE v.document_id = v_doc.id AND v.version = v_doc.version
     ) THEN
    INSERT INTO public.lesson_document_versions
      (document_id, user_id, version, content, schema_version, reason)
    VALUES
      (v_doc.id, auth.uid(), v_doc.version, v_doc.content, v_doc.schema_version, 'automatic');
    v_snapshot_created := true;
    PERFORM public.prune_lesson_document_versions(v_doc.id);
  END IF;

  UPDATE public.lesson_documents
  SET content = p_content,
      schema_version = p_schema_version,
      version = v_doc.version + 1
  WHERE id = v_doc.id;

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'version', v_doc.version + 1,
    'snapshot_created', v_snapshot_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_lesson_document(UUID, JSONB, INTEGER, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_lesson_document(UUID, JSONB, INTEGER, INTEGER, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.checkpoint_lesson_document(UUID);

CREATE FUNCTION public.checkpoint_lesson_document(
  p_lesson_id UUID,
  p_course_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_doc public.lesson_documents%ROWTYPE;
  v_snapshot_created BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF (p_lesson_id IS NOT NULL) = (p_course_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Informe exatamente um entre p_lesson_id e p_course_id' USING ERRCODE = '22023';
  END IF;

  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.user_id = auth.uid()
    AND d.lesson_id IS NOT DISTINCT FROM p_lesson_id
    AND d.course_id IS NOT DISTINCT FROM p_course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_document_versions v
    WHERE v.document_id = v_doc.id AND v.version = v_doc.version
  ) THEN
    INSERT INTO public.lesson_document_versions
      (document_id, user_id, version, content, schema_version, reason)
    VALUES
      (v_doc.id, auth.uid(), v_doc.version, v_doc.content, v_doc.schema_version, 'manual');
    v_snapshot_created := true;
    PERFORM public.prune_lesson_document_versions(v_doc.id);
  END IF;

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'version', v_doc.version,
    'snapshot_created', v_snapshot_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checkpoint_lesson_document(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkpoint_lesson_document(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.restore_lesson_document_version(UUID, INTEGER);

CREATE FUNCTION public.restore_lesson_document_version(
  p_lesson_id UUID,
  p_version INTEGER,
  p_course_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_doc public.lesson_documents%ROWTYPE;
  v_snapshot public.lesson_document_versions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF (p_lesson_id IS NOT NULL) = (p_course_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Informe exatamente um entre p_lesson_id e p_course_id' USING ERRCODE = '22023';
  END IF;

  IF p_version IS NULL OR p_version < 1 THEN
    RAISE EXCEPTION 'Versão inválida' USING ERRCODE = '22023';
  END IF;

  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.user_id = auth.uid()
    AND d.lesson_id IS NOT DISTINCT FROM p_lesson_id
    AND d.course_id IS NOT DISTINCT FROM p_course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_snapshot
  FROM public.lesson_document_versions v
  WHERE v.document_id = v_doc.id AND v.version = p_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão % não encontrada no histórico deste documento', p_version
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_document_versions v
    WHERE v.document_id = v_doc.id AND v.version = v_doc.version
  ) THEN
    INSERT INTO public.lesson_document_versions
      (document_id, user_id, version, content, schema_version, reason)
    VALUES
      (v_doc.id, auth.uid(), v_doc.version, v_doc.content, v_doc.schema_version, 'before_restore');
  END IF;

  UPDATE public.lesson_documents
  SET content = v_snapshot.content,
      schema_version = v_snapshot.schema_version,
      version = v_doc.version + 1
  WHERE id = v_doc.id;

  PERFORM public.prune_lesson_document_versions(v_doc.id);

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'version', v_doc.version + 1,
    'restored_from', p_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_lesson_document_version(UUID, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_lesson_document_version(UUID, INTEGER, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.publish_lesson_document(UUID);

CREATE FUNCTION public.publish_lesson_document(
  p_lesson_id UUID,
  p_course_id UUID DEFAULT NULL
)
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

  IF (p_lesson_id IS NOT NULL) = (p_course_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Informe exatamente um entre p_lesson_id e p_course_id' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.user_id = auth.uid()
    AND d.lesson_id IS NOT DISTINCT FROM p_lesson_id
    AND d.course_id IS NOT DISTINCT FROM p_course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.lesson_documents
  SET published_content = content,
      published_version = version,
      published_at = now()
  WHERE id = v_doc.id;

  -- Gera um snapshot manual no histórico ao publicar (comportamento
  -- original, migration 20260815182102).
  PERFORM public.checkpoint_lesson_document(p_lesson_id, p_course_id);

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'published_version', v_doc.version,
    'published_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_lesson_document(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_lesson_document(UUID, UUID) TO authenticated;
