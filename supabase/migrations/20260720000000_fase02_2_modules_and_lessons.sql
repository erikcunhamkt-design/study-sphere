-- Fase 02.2 — Módulos, aulas e árvore hierárquica de estudos.
-- Migration nova e incremental: não edita nenhuma migration anterior, não
-- remove/recria study_areas/courses, não enfraquece nenhuma policy/
-- constraint/grant já existente. A única alteração em `courses` é aditiva
-- (uma nova UNIQUE constraint, necessária para a FK composta de
-- course_modules — id já é PK, então não há duplicata possível).

-- =====================================================================
-- 0) Preparação de courses
-- =====================================================================

ALTER TABLE public.courses
  ADD CONSTRAINT courses_id_user_id_key UNIQUE (id, user_id);

-- =====================================================================
-- 1) course_modules
-- =====================================================================

CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_modules_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT course_modules_name_length_check CHECK (char_length(name) <= 120),
  CONSTRAINT course_modules_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT course_modules_position_check CHECK (position >= 0),
  -- Necessário para a FK composta de lessons(module_id, course_id, user_id)
  -- poder referenciar esta tabela e recusar, no próprio banco, uma aula
  -- cujo course_id não bata com o curso real do módulo.
  CONSTRAINT course_modules_id_course_id_user_id_key UNIQUE (id, course_id, user_id),
  -- Chave composta: só permite vincular o módulo a um curso que pertença
  -- ao MESMO user_id do módulo — impede módulo do usuário A em curso do
  -- usuário B mesmo via requisição direta que ignore a interface.
  CONSTRAINT course_modules_course_user_fkey
    FOREIGN KEY (course_id, user_id)
    REFERENCES public.courses(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX course_modules_user_id_idx ON public.course_modules(user_id);
CREATE INDEX course_modules_course_id_idx ON public.course_modules(course_id);
CREATE INDEX course_modules_listing_idx
  ON public.course_modules(course_id, is_archived, position);
CREATE INDEX course_modules_user_archived_idx
  ON public.course_modules(user_id, is_archived);

-- Ordem obrigatória: RLS antes de qualquer GRANT; REVOKE explícito antes
-- do GRANT mínimo — não presume que os privilégios padrão do projeto em
-- PUBLIC/anon/authenticated estejam vazios.
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.course_modules
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.course_modules
  TO authenticated;

GRANT ALL ON public.course_modules TO service_role;

CREATE POLICY "course_modules_select_own" ON public.course_modules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "course_modules_insert_own" ON public.course_modules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "course_modules_update_own" ON public.course_modules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "course_modules_delete_own" ON public.course_modules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reaproveita a trim_name() já existente (Fase 02.1) — a coluna se chama
-- "name" aqui também, então a mesma função de trigger serve sem alteração.
CREATE TRIGGER course_modules_trim_name
  BEFORE INSERT OR UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.trim_name();

-- Reaproveita a set_updated_at() já existente (Fase 01).
CREATE TRIGGER course_modules_set_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 2) lessons
-- =====================================================================

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  module_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lessons_title_not_blank_check CHECK (btrim(title) <> ''),
  CONSTRAINT lessons_title_length_check CHECK (char_length(title) <= 160),
  CONSTRAINT lessons_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT lessons_position_check CHECK (position >= 0),
  -- Chave composta tripla: a aula só pode apontar para um módulo que
  -- exista, pertença ao mesmo usuário E cujo course_id bata exatamente
  -- com o course_id enviado na própria aula — isso impede tanto "aula de
  -- outro usuário/módulo" quanto "aula com course_id incompatível com o
  -- módulo" (um módulo do curso X nunca casa com uma aula que declare
  -- course_id = Y), tudo garantido pelo Postgres, não pela interface.
  CONSTRAINT lessons_module_course_user_fkey
    FOREIGN KEY (module_id, course_id, user_id)
    REFERENCES public.course_modules(id, course_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX lessons_user_id_idx ON public.lessons(user_id);
CREATE INDEX lessons_course_id_idx ON public.lessons(course_id);
CREATE INDEX lessons_module_id_idx ON public.lessons(module_id);
CREATE INDEX lessons_module_listing_idx
  ON public.lessons(module_id, is_archived, position);
CREATE INDEX lessons_course_completed_idx
  ON public.lessons(course_id, is_completed);
CREATE INDEX lessons_user_archived_idx ON public.lessons(user_id, is_archived);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.lessons
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.lessons
  TO authenticated;

GRANT ALL ON public.lessons TO service_role;

CREATE POLICY "lessons_select_own" ON public.lessons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lessons_insert_own" ON public.lessons
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lessons_update_own" ON public.lessons
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lessons_delete_own" ON public.lessons
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER lessons_set_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 3) Normalização de título (trim_title) — lessons.title, não .name
-- =====================================================================
-- trim_name() já existente só serve para colunas chamadas "name"
-- (referencia NEW.name diretamente); lessons usa "title", então precisa
-- de uma função irmã, não uma duplicata da mesma lógica sob outro nome —
-- o corpo é idêntico em espírito (btrim antes de salvar), só muda a
-- coluna manipulada.
CREATE OR REPLACE FUNCTION public.trim_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.title = btrim(NEW.title);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trim_title() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lessons_trim_title
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.trim_title();

-- =====================================================================
-- 4) Coerência de conclusão (is_completed / completed_at)
-- =====================================================================
-- Regra única, aplicada em INSERT e UPDATE, sem precisar comparar com
-- OLD: sempre que is_completed é true, garante completed_at preenchido
-- (só define now() se o cliente não tiver enviado um valor — permite
-- restaurar uma aula concluída preservando a data de conclusão original,
-- ver camada de aplicação); sempre que is_completed é false, força
-- completed_at para NULL, sem exceção. Isso cobre "false→true preenche",
-- "→false limpa", "INSERT completo já nasce com completed_at" e "nunca
-- fica em estado contraditório" com uma única passada determinística.
CREATE OR REPLACE FUNCTION public.sync_lesson_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_completed THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    END IF;
  ELSE
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_lesson_completion() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lessons_sync_completion
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_completion();

-- =====================================================================
-- 5) Funções transacionais de reordenação
-- =====================================================================
-- Mesmo algoritmo e mesmas garantias de reorder_study_areas/
-- reorder_courses (Fase 02.1): SECURITY INVOKER, exige o conjunto ATIVO
-- COMPLETO (rejeita subconjunto, duplicata, arquivado, item de outro
-- curso/módulo/usuário, vazio quando não deveria estar vazio), aplica
-- 0..N-1 em uma única UPDATE atômica, nunca inclui course_id/module_id
-- no SET (estruturalmente impossível mover item entre pais por aqui).

CREATE OR REPLACE FUNCTION public.reorder_course_modules(p_course_id UUID, p_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_expected_count INTEGER;
  v_provided_count INTEGER;
  v_distinct_count INTEGER;
  v_matching_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses WHERE id = p_course_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Curso não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_expected_count
  FROM public.course_modules
  WHERE user_id = auth.uid() AND course_id = p_course_id AND is_archived = false;

  v_provided_count := COALESCE(array_length(p_ids, 1), 0);

  IF v_provided_count = 0 THEN
    IF v_expected_count = 0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'A lista não pode estar vazia: existem % módulo(s) ativo(s) neste curso', v_expected_count
      USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT id) INTO v_distinct_count FROM unnest(p_ids) AS id;
  IF v_distinct_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém IDs duplicados' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_matching_count
  FROM public.course_modules
  WHERE id = ANY(p_ids) AND user_id = auth.uid() AND course_id = p_course_id AND is_archived = false;

  IF v_matching_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém módulos inválidos (arquivados, de outro curso/usuário ou inexistentes)'
      USING ERRCODE = '42501';
  END IF;

  IF v_matching_count <> v_expected_count THEN
    RAISE EXCEPTION 'A lista precisa conter exatamente todos os % módulo(s) ativo(s) deste curso — recebido: %',
      v_expected_count, v_provided_count
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.course_modules AS m
  SET position = ord.new_position
  FROM (
    SELECT id, ord - 1 AS new_position
    FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
  ) AS ord
  WHERE m.id = ord.id AND m.user_id = auth.uid() AND m.course_id = p_course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_course_modules(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_course_modules(UUID, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_lessons(p_module_id UUID, p_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_expected_count INTEGER;
  v_provided_count INTEGER;
  v_distinct_count INTEGER;
  v_matching_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.course_modules WHERE id = p_module_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Módulo não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_expected_count
  FROM public.lessons
  WHERE user_id = auth.uid() AND module_id = p_module_id AND is_archived = false;

  v_provided_count := COALESCE(array_length(p_ids, 1), 0);

  IF v_provided_count = 0 THEN
    IF v_expected_count = 0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'A lista não pode estar vazia: existem % aula(s) ativa(s) neste módulo', v_expected_count
      USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT id) INTO v_distinct_count FROM unnest(p_ids) AS id;
  IF v_distinct_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém IDs duplicados' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_matching_count
  FROM public.lessons
  WHERE id = ANY(p_ids) AND user_id = auth.uid() AND module_id = p_module_id AND is_archived = false;

  IF v_matching_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém aulas inválidas (arquivadas, de outro módulo/usuário ou inexistentes)'
      USING ERRCODE = '42501';
  END IF;

  IF v_matching_count <> v_expected_count THEN
    RAISE EXCEPTION 'A lista precisa conter exatamente todas as % aula(s) ativa(s) deste módulo — recebido: %',
      v_expected_count, v_provided_count
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.lessons AS l
  SET position = ord.new_position
  FROM (
    SELECT id, ord - 1 AS new_position
    FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
  ) AS ord
  WHERE l.id = ord.id AND l.user_id = auth.uid() AND l.module_id = p_module_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_lessons(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_lessons(UUID, UUID[]) TO authenticated;
