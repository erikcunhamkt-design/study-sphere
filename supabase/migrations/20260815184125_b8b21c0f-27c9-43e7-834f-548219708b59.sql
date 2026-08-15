-- Recuperação V1.2 — Metacognição Separada da Evidência

-- 1. Evoluir enums de resultados (Idempotente)
-- recall_result: distinguir explicitamente entre objetivo e autoavaliado
DO $$ 
BEGIN
  -- recall_result
  ALTER TYPE public.recall_result ADD VALUE IF NOT EXISTS 'self_reported_correct';
  ALTER TYPE public.recall_result ADD VALUE IF NOT EXISTS 'self_reported_partial';
  ALTER TYPE public.recall_result ADD VALUE IF NOT EXISTS 'self_reported_incorrect';
  
  -- result_source: para futuras avaliações manuais ou IA
  -- Já temos 'self_assessment', 'objective', 'manual', 'ai' da V1.1
END $$;

-- 2. Evoluir a tabela cognitive_evidences
ALTER TABLE public.cognitive_evidences 
  ADD COLUMN IF NOT EXISTS confidence_source TEXT NOT NULL DEFAULT 'self_report';

-- 3. Atualizar a RPC record_recall_attempt para refletir a nova semântica
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
    confidence, confidence_source, response_time_ms, concept_id
  ) VALUES (
    v_user_id, v_lesson_id, p_question_id, p_session_id,
    p_published_version, p_result, p_result_source,
    p_confidence, 'self_report', p_response_time_ms, v_concept_id
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
