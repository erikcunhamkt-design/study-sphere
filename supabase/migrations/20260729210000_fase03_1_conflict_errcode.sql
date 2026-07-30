-- Fase 03.1 — Correção: ERRCODE de conflito de versão não pode ser 40001.
-- Migration nova e incremental: não edita migrations anteriores, não altera
-- tabelas, RLS, grants nem a lógica de negócio — apenas redefine
-- save_lesson_document trocando o SQLSTATE usado para sinalizar conflito
-- de versão otimista. checkpoint_lesson_document e
-- restore_lesson_document_version não sinalizam conflito, portanto não
-- mudam.
--
-- Motivação (achado do QA ao vivo, 29/07/2026): 40001 é
-- "serialization_failure", o SQLSTATE que o PostgREST/pooler interpreta
-- como "transação que deve ser re-executada". Como o nosso conflito é
-- determinístico (expected_version ≠ version atual continua falso em
-- qualquer re-execução), a camada HTTP re-executa em loop e a resposta
-- NUNCA chega ao cliente: o save fica "Salvando…" para sempre e o diálogo
-- de conflito nunca abre. Contraprova medida: erro com ERRCODE 22023
-- responde em ~500ms; com 40001, pendura indefinidamente (>10s, sem fim).
-- O lock_timeout (migration 20260727130000) tratou um sintoma
-- mal-diagnosticado; permanece como defesa válida contra locks reais.
--
-- Correção: SQLSTATE customizado 'VC409' ("Version Conflict / HTTP 409"),
-- que nenhuma camada re-executa nem mapeia para retry. O cliente passa a
-- reconhecer VC409 em VERSION_CONFLICT_ERROR_CODE (src/features/
-- lesson-editor/types.ts, mesmo commit).

CREATE OR REPLACE FUNCTION public.save_lesson_document(
  p_lesson_id UUID,
  p_content JSONB,
  p_schema_version INTEGER,
  p_expected_version INTEGER
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

  IF p_content IS NULL OR jsonb_typeof(p_content) <> 'array' THEN
    RAISE EXCEPTION 'O conteúdo do documento precisa ser um array JSON' USING ERRCODE = '22023';
  END IF;

  IF p_schema_version IS NULL OR p_schema_version < 1 THEN
    RAISE EXCEPTION 'schema_version inválido' USING ERRCODE = '22023';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version < 0 THEN
    RAISE EXCEPTION 'expected_version inválido' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE id = p_lesson_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Aula não encontrada para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  -- Nunca espera o lock da linha indefinidamente (ver migration
  -- 20260727130000).
  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.lesson_id = p_lesson_id AND d.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN
      RAISE EXCEPTION 'Conflito de versão: o documento esperado (versão %) não existe', p_expected_version
        USING ERRCODE = 'VC409';
    END IF;

    BEGIN
      INSERT INTO public.lesson_documents (user_id, lesson_id, content, schema_version, version)
      VALUES (auth.uid(), p_lesson_id, p_content, p_schema_version, 1)
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

  -- Conteúdo idêntico: nada a gravar, nada a versionar.
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
