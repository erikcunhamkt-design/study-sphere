-- Recuperação V1.1 — Evidência de Conhecimento (Correção de Duplicação)

-- 1. Criar enums para consistência (Idempotente)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recall_result') THEN
    CREATE TYPE public.recall_result AS ENUM ('correct', 'partial', 'incorrect', 'no_answer', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'result_source') THEN
    CREATE TYPE public.result_source AS ENUM ('self_assessment', 'objective', 'manual', 'ai');
  END IF;
END $$;

-- 2. Tabela de Evidências de Conhecimento (Cognitive Evidences)
-- Usamos IF NOT EXISTS para evitar erros se a migração parcial foi aplicada
CREATE TABLE IF NOT EXISTS public.cognitive_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Contexto
  lesson_id UUID NULL REFERENCES public.lessons(id) ON DELETE SET NULL,
  question_id UUID NULL REFERENCES public.questions(id) ON DELETE SET NULL,
  session_id UUID NULL REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  published_version INTEGER NULL,
  
  -- O que realmente aconteceu
  result public.recall_result NOT NULL,
  result_source public.result_source NOT NULL DEFAULT 'self_assessment',
  
  -- Metacognição
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 4),
  response_time_ms INTEGER NOT NULL,
  
  -- Conteúdo snapshot
  concept_id UUID NULL,

  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants e RLS (Idempotentes ou seguros de repetir)
ALTER TABLE public.cognitive_evidences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.cognitive_evidences TO authenticated;
GRANT ALL ON public.cognitive_evidences TO service_role;

-- Eliminar políticas existentes se houver para evitar erro de duplicação
DROP POLICY IF EXISTS "cognitive_evidences_select_own" ON public.cognitive_evidences;
CREATE POLICY "cognitive_evidences_select_own" ON public.cognitive_evidences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cognitive_evidences_insert_own" ON public.cognitive_evidences;
CREATE POLICY "cognitive_evidences_insert_own" ON public.cognitive_evidences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS cognitive_evidences_user_lesson_idx ON public.cognitive_evidences (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS cognitive_evidences_user_question_idx ON public.cognitive_evidences (user_id, question_id);
CREATE INDEX IF NOT EXISTS cognitive_evidences_attempted_at_idx ON public.cognitive_evidences (attempted_at DESC);

-- 3. Vincular Questão a Conceito (Preparação V1.1)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='concept_id') THEN
    ALTER TABLE public.questions ADD COLUMN concept_id UUID NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='concept_tag') THEN
    ALTER TABLE public.questions ADD COLUMN concept_tag TEXT NULL;
  END IF;
END $$;

-- 4. RPC para registrar tentativa com evidência
CREATE OR REPLACE FUNCTION public.record_recall_attempt(
  p_session_id UUID,
  p_question_id UUID,
  p_response TEXT,
  p_result public.recall_result,
  p_result_source public.result_source,
  p_confidence INTEGER,
  p_response_time_ms INTEGER,
  p_published_version INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_evidence_id UUID;
  v_user_id UUID;
  v_lesson_id UUID;
  v_concept_id UUID;
BEGIN
  -- Verificar sessão e usuário
  SELECT user_id, lesson_id INTO v_user_id, v_lesson_id
  FROM public.study_sessions
  WHERE id = p_session_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão não encontrada ou não pertence ao usuário' USING ERRCODE = '42501';
  END IF;

  -- Obter conceito da questão se disponível
  SELECT concept_id INTO v_concept_id
  FROM public.questions
  WHERE id = p_question_id;

  -- 1. Inserir na tabela de evidências (Imutável)
  INSERT INTO public.cognitive_evidences (
    user_id, lesson_id, question_id, session_id, 
    published_version, result, result_source, 
    confidence, response_time_ms, concept_id
  ) VALUES (
    v_user_id, v_lesson_id, p_question_id, p_session_id,
    p_published_version, p_result, p_result_source,
    p_confidence, p_response_time_ms, v_concept_id
  ) RETURNING id INTO v_evidence_id;

  -- 2. Atualizar o log da sessão
  UPDATE public.study_sessions
  SET details = jsonb_set(
    details, 
    '{questionAttempts}', 
    (COALESCE(details->'questionAttempts', '[]'::jsonb) || jsonb_build_object(
      'questionId', p_question_id,
      'evidenceId', v_evidence_id,
      'response', p_response,
      'result', p_result,
      'confidence', p_confidence,
      'responseTimeMs', p_response_time_ms,
      'attemptedAt', now()
    ))
  )
  WHERE id = p_session_id;

  RETURN v_evidence_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_recall_attempt TO authenticated;
