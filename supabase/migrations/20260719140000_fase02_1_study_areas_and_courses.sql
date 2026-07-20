-- Fase 02.1 — Áreas de conhecimento e cursos.
-- Migration nova e incremental: não edita nenhuma migration anterior, não
-- altera profiles/user_preferences, não remove nem enfraquece nenhuma
-- policy/constraint/grant já existente.

-- =====================================================================
-- 1) study_areas
-- =====================================================================

CREATE TABLE public.study_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  color TEXT NOT NULL DEFAULT 'magenta',
  position INTEGER NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT study_areas_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT study_areas_name_length_check CHECK (char_length(name) <= 120),
  CONSTRAINT study_areas_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT study_areas_position_check CHECK (position >= 0),
  CONSTRAINT study_areas_color_check CHECK (
    color IN ('magenta', 'violet', 'blue', 'cyan', 'emerald', 'amber', 'orange', 'rose', 'slate')
  ),
  CONSTRAINT study_areas_icon_check CHECK (
    icon IN (
      'BookOpen', 'Megaphone', 'Landmark', 'Brain', 'Palette', 'Code2',
      'Languages', 'Calculator', 'Briefcase', 'GraduationCap', 'FlaskConical', 'Globe2'
    )
  ),
  -- Necessário para a foreign key composta de courses (study_area_id, user_id)
  -- poder referenciar esta tabela e assim recusar, no próprio banco, um
  -- curso do usuário A apontando para uma área do usuário B.
  CONSTRAINT study_areas_id_user_id_key UNIQUE (id, user_id)
);

CREATE INDEX study_areas_user_id_idx ON public.study_areas(user_id);
CREATE INDEX study_areas_listing_idx ON public.study_areas(user_id, is_archived, position);

-- Ordem segura: RLS habilitada e privilégios explicitamente zerados ANTES
-- de qualquer GRANT — não presume que os privilégios padrão do projeto em
-- PUBLIC/anon/authenticated estejam vazios, revoga tudo primeiro e só
-- então concede exatamente o necessário.
ALTER TABLE public.study_areas ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.study_areas
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.study_areas
  TO authenticated;

GRANT ALL ON public.study_areas TO service_role;

CREATE POLICY "study_areas_select_own" ON public.study_areas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "study_areas_insert_own" ON public.study_areas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_areas_update_own" ON public.study_areas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_areas_delete_own" ON public.study_areas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER study_areas_set_updated_at
  BEFORE UPDATE ON public.study_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 2) courses
-- =====================================================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_area_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  position INTEGER NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT courses_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT courses_name_length_check CHECK (char_length(name) <= 120),
  CONSTRAINT courses_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT courses_position_check CHECK (position >= 0),
  CONSTRAINT courses_status_check CHECK (status IN ('not_started', 'in_progress', 'completed')),
  -- Chave composta: só permite vincular o curso a uma área que pertença ao
  -- MESMO user_id do curso. Isso é aplicado pelo próprio Postgres — um
  -- INSERT/UPDATE tentando misturar study_area_id de um usuário com
  -- user_id de outro é rejeitado com violação de foreign key (23503),
  -- mesmo via requisição direta que ignore a interface.
  CONSTRAINT courses_study_area_user_fkey
    FOREIGN KEY (study_area_id, user_id)
    REFERENCES public.study_areas(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX courses_user_id_idx ON public.courses(user_id);
CREATE INDEX courses_study_area_id_idx ON public.courses(study_area_id);
CREATE INDEX courses_area_position_idx ON public.courses(study_area_id, position);
CREATE INDEX courses_user_archived_favorite_idx
  ON public.courses(user_id, is_archived, is_favorite);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.courses
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.courses
  TO authenticated;

GRANT ALL ON public.courses TO service_role;

CREATE POLICY "courses_select_own" ON public.courses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "courses_insert_own" ON public.courses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses_update_own" ON public.courses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses_delete_own" ON public.courses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 3) Normalização de nome (trim) no servidor
-- =====================================================================
-- Reforça "nome normalizado com trim antes de salvar" no próprio banco,
-- não só na interface: qualquer INSERT/UPDATE grava name já sem espaços
-- nas pontas. Como os CHECKs de "não-vazio" acima avaliam o valor já após
-- os triggers BEFORE ROW, um nome só-espaços vira '' aqui e é rejeitado
-- pelo *_name_not_blank_check correspondente — mesmo comportamento usado
-- para profiles.full_name/timezone na Fase 01.1.
CREATE OR REPLACE FUNCTION public.trim_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name = btrim(NEW.name);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trim_name() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER study_areas_trim_name
  BEFORE INSERT OR UPDATE ON public.study_areas
  FOR EACH ROW EXECUTE FUNCTION public.trim_name();

CREATE TRIGGER courses_trim_name
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.trim_name();

-- =====================================================================
-- 4) Funções transacionais de reordenação
-- =====================================================================
-- SECURITY INVOKER (não DEFINER): a UPDATE dentro da função roda com o
-- privilégio do próprio usuário autenticado, então a RLS de study_areas/
-- courses acima continua valendo como segunda camada de defesa mesmo que a
-- validação explícita abaixo tivesse algum furo.
--
-- As duas funções exigem o CONJUNTO COMPLETO dos IDs ativos (do usuário,
-- ou da área) — não aceitam reordenar um subconjunto. O algoritmo:
--
--   1. Se não autenticado (auth.uid() IS NULL) -> rejeita.
--   2. Calcula v_expected_count = quantas linhas ativas deveriam estar
--      no array (do usuário, ou da área+usuário).
--   3. Se o array recebido está vazio: só aceita se v_expected_count = 0
--      (nada para reordenar); senão rejeita.
--   4. Conta IDs distintos no array recebido; se for diferente da
--      quantidade recebida, há duplicata -> rejeita.
--   5. Conta quantas linhas do array recebido são realmente ativas E
--      pertencem ao usuário (e à área, no caso de cursos) — chamado de
--      v_matching_count. Se v_matching_count for diferente da quantidade
--      recebida, algum ID do array é inválido (arquivado, de outro
--      usuário/área, ou inexistente) -> rejeita.
--   6. Se v_matching_count for diferente de v_expected_count, o array,
--      apesar de só conter IDs válidos, não cobre TODAS as linhas ativas
--      esperadas (é um subconjunto) -> rejeita.
--   7. Só resta a possibilidade de o array ser exatamente o conjunto
--      esperado (mesma cardinalidade, sem duplicata, todos válidos, todos
--      presentes) -> aplica as novas posições 0..N-1, na mesma ordem do
--      array, em uma única instrução UPDATE (atômica).
--
-- Qualquer RAISE EXCEPTION aborta a função inteira antes do UPDATE, então
-- nunca há posições parciais gravadas em caso de erro.

CREATE OR REPLACE FUNCTION public.reorder_study_areas(p_ids UUID[])
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

  SELECT count(*) INTO v_expected_count
  FROM public.study_areas
  WHERE user_id = auth.uid() AND is_archived = false;

  v_provided_count := COALESCE(array_length(p_ids, 1), 0);

  IF v_provided_count = 0 THEN
    IF v_expected_count = 0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'A lista não pode estar vazia: existem % área(s) ativa(s)', v_expected_count
      USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT id) INTO v_distinct_count FROM unnest(p_ids) AS id;
  IF v_distinct_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém IDs duplicados' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_matching_count
  FROM public.study_areas
  WHERE id = ANY(p_ids) AND user_id = auth.uid() AND is_archived = false;

  IF v_matching_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém IDs inválidos (arquivados, de outro usuário ou inexistentes)'
      USING ERRCODE = '42501';
  END IF;

  IF v_matching_count <> v_expected_count THEN
    RAISE EXCEPTION 'A lista precisa conter exatamente todas as % área(s) ativa(s) do usuário — recebido: %',
      v_expected_count, v_provided_count
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.study_areas AS sa
  SET position = ord.new_position
  FROM (
    SELECT id, ord - 1 AS new_position
    FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
  ) AS ord
  WHERE sa.id = ord.id AND sa.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_study_areas(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_study_areas(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_courses(p_study_area_id UUID, p_ids UUID[])
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
    SELECT 1 FROM public.study_areas
    WHERE id = p_study_area_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Área de conhecimento não encontrada para o usuário autenticado'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_expected_count
  FROM public.courses
  WHERE user_id = auth.uid() AND study_area_id = p_study_area_id AND is_archived = false;

  v_provided_count := COALESCE(array_length(p_ids, 1), 0);

  IF v_provided_count = 0 THEN
    IF v_expected_count = 0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'A lista não pode estar vazia: existem % curso(s) ativo(s) nesta área', v_expected_count
      USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT id) INTO v_distinct_count FROM unnest(p_ids) AS id;
  IF v_distinct_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém IDs duplicados' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_matching_count
  FROM public.courses
  WHERE id = ANY(p_ids)
    AND user_id = auth.uid()
    AND study_area_id = p_study_area_id
    AND is_archived = false;

  IF v_matching_count <> v_provided_count THEN
    RAISE EXCEPTION 'A lista contém cursos inválidos (arquivados, de outra área/usuário ou inexistentes)'
      USING ERRCODE = '42501';
  END IF;

  IF v_matching_count <> v_expected_count THEN
    RAISE EXCEPTION 'A lista precisa conter exatamente todos os % curso(s) ativo(s) desta área — recebido: %',
      v_expected_count, v_provided_count
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.courses AS c
  SET position = ord.new_position
  FROM (
    SELECT id, ord - 1 AS new_position
    FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
  ) AS ord
  WHERE c.id = ord.id AND c.user_id = auth.uid() AND c.study_area_id = p_study_area_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_courses(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_courses(UUID, UUID[]) TO authenticated;
