-- Fase 05.2 — Métodos de estudo (log de sessões) e integração com o dashboard.
--
-- Escopo: Pomodoro, Feynman, blurting, Cornell, recordação ativa (hub sem
-- linha própria, ver nota abaixo) e sessão livre. study_sessions é um log
-- MUTÁVEL do próprio usuário (diferente de flashcard_reviews/question_
-- attempts, que são logs imutáveis alimentando agregações compartilhadas
-- de OUTRAS entidades): não há RPC, não há algoritmo a proteger, não há
-- placar de terceiros em risco. CRUD direto pelo cliente, RLS + CHECKs
-- bastam.
--
-- Decisão de Gate 1: os 4 parâmetros do Pomodoro (foco/pausa curta/pausa
-- longa/ciclos) e a meta diária são lidos de user_preferences (já
-- existente desde a Fase 01, com UI de edição própria desde a 01.2) —
-- nunca duplicados aqui.
--
-- "recordacao_ativa" está no CHECK de method por completude com o que foi
-- acordado no Gate 1 da Fase 05, mas nenhuma tela desta fase insere uma
-- linha com esse método: recordação ativa é um hub que só aponta para
-- flashcards/questões, cuja atividade já é logada em flashcard_reviews/
-- question_attempts — duplicar aqui contaria a mesma atividade duas vezes.
--
-- Diferença deliberada de exam_attempts: lá o INSERT é forçado a nascer
-- "em andamento" (sem ended_at) porque uma tentativa de simulado só faz
-- sentido em tempo real. Aqui um INSERT já pode chegar com started_at E
-- ended_at preenchidos (ex.: logar uma sessão "livre" depois do fato) —
-- não há trigger de INSERT, só de UPDATE.
--
-- Segue o padrão de segurança das fases 01–05.1: RLS antes de grants,
-- REVOKE ALL antes de GRANT mínimo, FK composta contra vínculo cruzado
-- entre usuários, nenhum ERRCODE 40001, mensagens em português.

CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NULL,
  method TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED,
  -- Forma livre por método (cycles_completed, explicacao, texto,
  -- notas/pistas/resumo, nota) — texto plano só, sem editor rico (lição
  -- do vazamento de bundle da Fase 04). O CHECK de tamanho abaixo é o
  -- único guarda-corpo de dimensão: diferente de questions, não há regra
  -- de negócio estruturada por campo aqui, só uma anotação livre do
  -- usuário sobre a própria sessão.
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT study_sessions_method_check
    CHECK (method IN ('pomodoro', 'feynman', 'recordacao_ativa', 'blurting', 'cornell', 'livre')),
  CONSTRAINT study_sessions_ended_after_started_check
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  -- jsonb_typeof nunca lança erro (ao contrário de jsonb_array_length em
  -- valor não-array) — seguro incondicional, sem necessidade do CASE
  -- aninhado usado em questions_type_shape_check.
  CONSTRAINT study_sessions_details_is_object_check
    CHECK (jsonb_typeof(details) = 'object'),
  CONSTRAINT study_sessions_details_size_check
    CHECK (octet_length(details::text) <= 100000),

  CONSTRAINT study_sessions_id_user_id_key UNIQUE (id, user_id),

  -- lesson_id NULL pula a checagem (MATCH SIMPLE) — sessão avulsa, mesmo
  -- padrão de flashcards/questions. ON DELETE SET NULL só em lesson_id:
  -- apagar a aula desvincula a sessão, nunca apaga o histórico dela.
  CONSTRAINT study_sessions_lesson_user_fkey
    FOREIGN KEY (lesson_id, user_id)
    REFERENCES public.lessons(id, user_id)
    ON DELETE SET NULL (lesson_id)
);

CREATE INDEX study_sessions_user_started_idx
  ON public.study_sessions (user_id, started_at DESC);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.study_sessions FROM PUBLIC, anon, authenticated;

-- CRUD completo direto ao cliente: começar/editar/apagar a própria sessão
-- é operação simples sem estado compartilhado a proteger. DELETE
-- permitido pela mesma filosofia de exam_attempts — é histórico do
-- próprio usuário, nada mais depende dele por agregação.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;

CREATE POLICY "study_sessions_select_own" ON public.study_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "study_sessions_insert_own" ON public.study_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_sessions_update_own" ON public.study_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_sessions_delete_own" ON public.study_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER study_sessions_set_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Imutabilidade simples, sem set_config/RPC: ao contrário de exam_attempts
-- e question_attempts, não existe uma porta privilegiada a reconciliar —
-- o UPDATE direto do cliente já É o caminho aprovado. started_at é
-- imutável a partir do INSERT (protege duration_seconds, coluna gerada).
-- ended_at é write-once: a transição NULL -> valor (finalizar a sessão) é
-- sempre permitida; uma vez preenchido, travado. method/lesson_id/details
-- continuam livremente editáveis a qualquer momento (é conteúdo do
-- usuário, ex.: corrigir a explicação do Feynman depois de finalizar).
CREATE OR REPLACE FUNCTION public.enforce_study_session_timing_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'O início da sessão é imutável' USING ERRCODE = '22023';
  END IF;

  IF OLD.ended_at IS NOT NULL AND NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
    RAISE EXCEPTION 'O fim da sessão já foi registrado e não pode ser alterado'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_study_session_timing_immutability()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER study_sessions_enforce_timing_immutability
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_study_session_timing_immutability();

-- Residual aceito (documentar, mesma classe já aceita em
-- exam_attempts.started_at): o usuário pode informar um started_at
-- retroativo no INSERT, inflando a própria duração. Autoinfligido, sem
-- impacto entre usuários.
