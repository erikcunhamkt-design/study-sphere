-- Fase 06.1 — Agenda de estudos (tabela planned_studies).

-- Migration incremental: cria a tabela de estudos planejados e seus índices.

-- Sem RPC e sem trigger de status (decisão do Gate 2): o vínculo com uma

-- sessão real e a marcação de 'completed' são feitos por UPDATE explícito do

-- app, quando uma study_sessions JÁ FINALIZADA é vinculada.

-- Dependências: profiles (Fase 01), study_areas/courses (Fase 02.1),

-- study_sessions (Fase 05.2), set_updated_at() (Fase 01).

-- =====================================================================

-- 1) Pré-requisito: courses precisa de UNIQUE(id, user_id) para a FK composta

-- =====================================================================

-- study_areas já tem UNIQUE(id, user_id) (constraint study_areas_id_user_id_key,

-- Fase 02.1). courses tem só PK(id) — falta a chave composta para poder ser

-- referenciada por (course_id, user_id). Adiciona de forma idempotente.

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'courses_id_user_id_key'

      AND conrelid = 'public.courses'::regclass

  ) THEN

    ALTER TABLE public.courses

      ADD CONSTRAINT courses_id_user_id_key UNIQUE (id, user_id);

  END IF;

END $$;

-- =====================================================================

-- 2) Tabela planned_studies

-- =====================================================================

CREATE TABLE public.planned_studies (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,

  scheduled_date DATE NOT NULL,

  study_area_id UUID NULL,

  course_id UUID NULL,

  estimated_minutes INTEGER NULL,

  status TEXT NOT NULL DEFAULT 'planned',

  study_session_id UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT planned_studies_title_not_blank_check

    CHECK (btrim(title) <> ''),

  CONSTRAINT planned_studies_title_length_check

    CHECK (char_length(title) <= 120),

  CONSTRAINT planned_studies_minutes_check

    CHECK (estimated_minutes IS NULL OR (estimated_minutes BETWEEN 1 AND 1440)),

  CONSTRAINT planned_studies_status_check

    CHECK (status IN ('planned', 'completed', 'skipped')),

  CONSTRAINT planned_studies_id_user_id_key UNIQUE (id, user_id),

  -- FK composta: só vincula área do MESMO usuário. study_area_id NULL pula a

  -- checagem (MATCH SIMPLE). ON DELETE SET NULL (study_area_id) anula SÓ a

  -- coluna do vínculo — nunca user_id (que é NOT NULL) — ao apagar a área.

  CONSTRAINT planned_studies_study_area_user_fkey

    FOREIGN KEY (study_area_id, user_id)

    REFERENCES public.study_areas(id, user_id)

    MATCH SIMPLE ON DELETE SET NULL (study_area_id),

  -- FK composta análoga para curso.

  CONSTRAINT planned_studies_course_user_fkey

    FOREIGN KEY (course_id, user_id)

    REFERENCES public.courses(id, user_id)

    MATCH SIMPLE ON DELETE SET NULL (course_id),

  -- FK composta para a sessão real (05.2 tem UNIQUE(id, user_id)). Impede

  -- vincular sessão de outro usuário. Apagar a sessão desvincula, não apaga

  -- o planejamento.

  CONSTRAINT planned_studies_session_user_fkey

    FOREIGN KEY (study_session_id, user_id)

    REFERENCES public.study_sessions(id, user_id)

    MATCH SIMPLE ON DELETE SET NULL (study_session_id)

);

-- =====================================================================

-- 3) Índices

-- =====================================================================

-- Visão de calendário (planejados do mês por dia civil).

CREATE INDEX planned_studies_user_date_idx

  ON public.planned_studies (user_id, scheduled_date);

-- Dashboard: pendentes do usuário (índice parcial só sobre 'planned').

CREATE INDEX planned_studies_user_planned_idx

  ON public.planned_studies (user_id, scheduled_date)

  WHERE status = 'planned';

-- Join com a sessão vinculada (só linhas que têm vínculo).

CREATE INDEX planned_studies_session_idx

  ON public.planned_studies (study_session_id)

  WHERE study_session_id IS NOT NULL;

-- =====================================================================

-- 4) RLS, revogação e grants (least-privilege, padrão desde a Fase 01.2)

-- =====================================================================

ALTER TABLE public.planned_studies ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.planned_studies

  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planned_studies

  TO authenticated;

GRANT ALL ON public.planned_studies TO service_role;

-- =====================================================================

-- 5) Políticas por operação (auth.uid() = user_id)

-- =====================================================================

CREATE POLICY "planned_studies_select_own" ON public.planned_studies

  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "planned_studies_insert_own" ON public.planned_studies

  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "planned_studies_update_own" ON public.planned_studies

  FOR UPDATE TO authenticated

  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "planned_studies_delete_own" ON public.planned_studies

  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================================

-- 6) Trigger de updated_at (reaproveita set_updated_at() da Fase 01)

-- =====================================================================

CREATE TRIGGER planned_studies_set_updated_at

  BEFORE UPDATE ON public.planned_studies

  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
