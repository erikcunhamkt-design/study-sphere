-- Fase 03.1 — Correção: lock_timeout nas funções de escrita do caderno.
-- Migration nova e incremental: não edita a migration anterior
-- (20260727120000), não altera tabelas, RLS, grants ou a lógica de
-- negócio de nenhuma função — apenas redefine as três funções que fazem
-- `SELECT ... FOR UPDATE` para nunca esperar o lock indefinidamente.
--
-- Motivação: testes reais de conflito de versão (duas abas) mostraram que,
-- se qualquer transação ficar presa segurando o lock da linha (por
-- exemplo, uma conexão do pool do PostgREST deixada em
-- `idle in transaction (aborted)` sem ROLLBACK), TODA chamada seguinte
-- a `save_lesson_document`/`checkpoint_lesson_document`/
-- `restore_lesson_document_version` para o mesmo documento trava
-- indefinidamente — sem timeout, sem erro, apenas pendurada — e cada nova
-- tentativa se enfileira atrás da anterior, empilhando o problema. Isso
-- não é um erro na lógica de conflito em si (que já é uma comparação e
-- `RAISE EXCEPTION` triviais, rápidos por natureza): é a ausência de um
-- limite de tempo para adquirir o lock.
--
-- Correção: `SET LOCAL lock_timeout` logo após o início de cada função,
-- antes do `FOR UPDATE`. Se o lock não for adquirido dentro do prazo, a
-- função falha rápido com SQLSTATE 55P03 (lock_not_available) em vez de
-- travar a requisição. O cliente já trata qualquer erro que não seja
-- 40001 (conflito de versão real) como falha transitória, com retry
-- automático e backoff (ver src/features/lesson-editor/use-autosave.ts)
-- — nenhuma mudança de aplicação é necessária.

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

  -- Nunca espera o lock da linha indefinidamente: se algo mais estiver
  -- com a linha travada, falha rápido e claro em vez de travar a
  -- requisição (e enfileirar outras atrás dela) para sempre.
  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.lesson_id = p_lesson_id AND d.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN
      RAISE EXCEPTION 'Conflito de versão: o documento esperado (versão %) não existe', p_expected_version
        USING ERRCODE = '40001';
    END IF;

    BEGIN
      INSERT INTO public.lesson_documents (user_id, lesson_id, content, schema_version, version)
      VALUES (auth.uid(), p_lesson_id, p_content, p_schema_version, 1)
      RETURNING id INTO v_new_id;
    EXCEPTION WHEN unique_violation THEN
      -- Outra aba/sessão criou o documento entre o SELECT e o INSERT.
      RAISE EXCEPTION 'Conflito de versão: o documento acabou de ser criado em outra sessão'
        USING ERRCODE = '40001';
    END;

    RETURN jsonb_build_object(
      'document_id', v_new_id,
      'version', 1,
      'snapshot_created', false
    );
  END IF;

  IF v_doc.version <> p_expected_version THEN
    RAISE EXCEPTION 'Conflito de versão: esperada %, atual %', p_expected_version, v_doc.version
      USING ERRCODE = '40001';
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

CREATE OR REPLACE FUNCTION public.checkpoint_lesson_document(p_lesson_id UUID)
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

  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.lesson_id = p_lesson_id AND d.user_id = auth.uid()
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

CREATE OR REPLACE FUNCTION public.restore_lesson_document_version(
  p_lesson_id UUID,
  p_version INTEGER
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

  IF p_version IS NULL OR p_version < 1 THEN
    RAISE EXCEPTION 'Versão inválida' USING ERRCODE = '22023';
  END IF;

  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_doc
  FROM public.lesson_documents d
  WHERE d.lesson_id = p_lesson_id AND d.user_id = auth.uid()
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
