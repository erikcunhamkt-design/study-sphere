-- Fase 03.1 — Caderno em blocos: documentos de aula, histórico e controle
-- de conflito por versão otimista.
-- Migration nova e incremental: não edita nenhuma migration anterior, não
-- remove/recria tabelas existentes, não enfraquece nenhuma policy/
-- constraint/grant já existente. A única alteração em `lessons` é aditiva
-- (uma nova UNIQUE constraint, necessária para a FK composta de
-- lesson_documents — id já é PK, então não há duplicata possível).

-- =====================================================================
-- 0) Preparação de lessons
-- =====================================================================

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_id_user_id_key UNIQUE (id, user_id);

-- =====================================================================
-- 1) lesson_documents — um caderno por aula e usuário
-- =====================================================================

CREATE TABLE public.lesson_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL,
  content JSONB NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- O documento BlockNote é sempre um array de blocos na raiz.
  CONSTRAINT lesson_documents_content_is_array_check
    CHECK (jsonb_typeof(content) = 'array'),
  -- Limite de ~5 MB por documento (tamanho do JSON serializado).
  CONSTRAINT lesson_documents_content_size_check
    CHECK (octet_length(content::text) <= 5242880),
  -- Mesmo teto de blocos da validação Zod do cliente — o banco também recusa.
  CONSTRAINT lesson_documents_block_count_check
    CHECK (jsonb_array_length(content) <= 5000),
  CONSTRAINT lesson_documents_schema_version_check CHECK (schema_version >= 1),
  CONSTRAINT lesson_documents_version_check CHECK (version >= 1),
  -- Um único documento por aula e usuário.
  CONSTRAINT lesson_documents_lesson_id_user_id_key UNIQUE (lesson_id, user_id),
  -- Necessário para a FK composta de lesson_document_versions poder
  -- referenciar esta tabela amarrando documento e usuário.
  CONSTRAINT lesson_documents_id_user_id_key UNIQUE (id, user_id),
  -- Chave composta: só permite vincular o documento a uma aula que
  -- pertença ao MESMO user_id — impede documento do usuário A em aula do
  -- usuário B mesmo via requisição direta que ignore a interface.
  CONSTRAINT lesson_documents_lesson_user_fkey
    FOREIGN KEY (lesson_id, user_id)
    REFERENCES public.lessons(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX lesson_documents_user_id_idx ON public.lesson_documents(user_id);

ALTER TABLE public.lesson_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.lesson_documents
  FROM PUBLIC, anon, authenticated;

-- Sem DELETE: o documento morre junto com a aula (cascata). Excluir o
-- caderno diretamente não é uma operação do produto nesta fase.
GRANT SELECT, INSERT, UPDATE
  ON TABLE public.lesson_documents
  TO authenticated;

GRANT ALL ON public.lesson_documents TO service_role;

CREATE POLICY "lesson_documents_select_own" ON public.lesson_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lesson_documents_insert_own" ON public.lesson_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_documents_update_own" ON public.lesson_documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER lesson_documents_set_updated_at
  BEFORE UPDATE ON public.lesson_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 2) Coerência de versionamento no próprio banco
-- =====================================================================
-- O fluxo oficial de escrita é save_lesson_document/restore, mas as
-- funções são SECURITY INVOKER, então o cliente autenticado também tem
-- UPDATE direto na tabela. Este trigger garante que nem por esse caminho
-- é possível trocar conteúdo sem declarar incremento de versão — a
-- proteção contra sobrescrita silenciosa não depende só da disciplina do
-- cliente.
CREATE OR REPLACE FUNCTION public.enforce_lesson_document_versioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.lesson_id <> OLD.lesson_id THEN
    RAISE EXCEPTION 'id, user_id e lesson_id do documento são imutáveis'
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

REVOKE EXECUTE ON FUNCTION public.enforce_lesson_document_versioning()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lesson_documents_enforce_versioning
  BEFORE UPDATE ON public.lesson_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_document_versioning();

-- =====================================================================
-- 3) lesson_document_versions — snapshots do histórico
-- =====================================================================

CREATE TABLE public.lesson_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  schema_version INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lesson_document_versions_reason_check
    CHECK (reason IN ('automatic', 'manual', 'before_restore')),
  CONSTRAINT lesson_document_versions_content_is_array_check
    CHECK (jsonb_typeof(content) = 'array'),
  CONSTRAINT lesson_document_versions_content_size_check
    CHECK (octet_length(content::text) <= 5242880),
  CONSTRAINT lesson_document_versions_block_count_check
    CHECK (jsonb_array_length(content) <= 5000),
  CONSTRAINT lesson_document_versions_schema_version_check CHECK (schema_version >= 1),
  CONSTRAINT lesson_document_versions_version_check CHECK (version >= 1),
  -- No máximo um snapshot por número de versão de cada documento.
  CONSTRAINT lesson_document_versions_document_id_version_key
    UNIQUE (document_id, version),
  -- Chave composta: o snapshot só pode apontar para um documento do
  -- MESMO user_id — impede histórico cruzado entre usuários no banco.
  CONSTRAINT lesson_document_versions_document_user_fkey
    FOREIGN KEY (document_id, user_id)
    REFERENCES public.lesson_documents(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX lesson_document_versions_user_id_idx
  ON public.lesson_document_versions(user_id);

ALTER TABLE public.lesson_document_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.lesson_document_versions
  FROM PUBLIC, anon, authenticated;

-- Sem UPDATE em hipótese alguma: nenhuma versão histórica pode ser
-- alterada pelo cliente (regra do plano, §10.7). INSERT e DELETE são
-- necessários porque as funções transacionais rodam como SECURITY
-- INVOKER (criam snapshots e podam o excedente com os privilégios do
-- próprio usuário autenticado, sempre sob RLS).
GRANT SELECT, INSERT, DELETE
  ON TABLE public.lesson_document_versions
  TO authenticated;

GRANT ALL ON public.lesson_document_versions TO service_role;

CREATE POLICY "lesson_document_versions_select_own" ON public.lesson_document_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lesson_document_versions_insert_own" ON public.lesson_document_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_document_versions_delete_own" ON public.lesson_document_versions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================================
-- 4) Poda do histórico — no máximo 30 snapshots por documento
-- =====================================================================
CREATE OR REPLACE FUNCTION public.prune_lesson_document_versions(p_document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lesson_document_versions v
  WHERE v.document_id = p_document_id
    AND v.id IN (
      SELECT v2.id
      FROM public.lesson_document_versions v2
      WHERE v2.document_id = p_document_id
      ORDER BY v2.version DESC
      OFFSET 30
    );
END;
$$;

REVOKE ALL ON FUNCTION public.prune_lesson_document_versions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_lesson_document_versions(UUID) TO authenticated;

-- =====================================================================
-- 5) save_lesson_document — criação/atualização com versão otimista
-- =====================================================================
-- Regras (plano §10.3/§10.4/§10.7):
--   • Cria o documento quando p_expected_version = 0 e ele não existe.
--   • Atualiza somente se a versão atual for exatamente a esperada;
--     divergência lança conflito (ERRCODE 40001) sem tocar em nada.
--   • Conteúdo idêntico não gera nova versão nem snapshot (no-op).
--   • Snapshot automático do estado ANTERIOR ao save, no máximo a cada
--     5 minutos (contados do snapshot mais recente do documento,
--     independentemente do motivo).
--   • FOR UPDATE serializa saves concorrentes do mesmo documento.
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

REVOKE ALL ON FUNCTION public.save_lesson_document(UUID, JSONB, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_lesson_document(UUID, JSONB, INTEGER, INTEGER) TO authenticated;

-- =====================================================================
-- 6) checkpoint_lesson_document — snapshot manual sob demanda
-- =====================================================================
-- O plano (§10.7) exige checkpoint manual; sem esta função, o único
-- caminho seria INSERT direto do cliente na tabela de versões, com
-- conteúdo arbitrário. Aqui o snapshot é sempre uma cópia fiel do estado
-- atual do documento. Chamada repetida sem mudanças é no-op.
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

REVOKE ALL ON FUNCTION public.checkpoint_lesson_document(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkpoint_lesson_document(UUID) TO authenticated;

-- =====================================================================
-- 7) restore_lesson_document_version — restauração transacional
-- =====================================================================
-- Regras (plano §10.3/§10.7): antes de restaurar, snapshot before_restore
-- do estado atual; a restauração escreve o conteúdo do snapshot escolhido
-- e INCREMENTA a versão atual (nunca "volta" o número da versão — o
-- histórico segue linear e o controle otimista das outras abas continua
-- válido).
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

REVOKE ALL ON FUNCTION public.restore_lesson_document_version(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_lesson_document_version(UUID, INTEGER) TO authenticated;
