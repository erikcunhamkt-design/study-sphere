-- MEMORY MODEL V1 — Estrutura e Persistência

-- 1. Tabela de Conceitos (Cognitive Units)
CREATE TABLE IF NOT EXISTS public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NULL REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants e RLS para concepts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concepts TO authenticated;
GRANT ALL ON public.concepts TO service_role;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concepts_owner_access" ON public.concepts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Tabela de Estados de Memória (Memory States)
CREATE TABLE IF NOT EXISTS public.memory_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  
  -- Métricas de Memória (Camada de Dados V1)
  strength FLOAT NOT NULL DEFAULT 0,
  stability FLOAT NOT NULL DEFAULT 0,
  difficulty FLOAT NOT NULL DEFAULT 0,
  
  -- Histórico Resumido
  last_recalled_at TIMESTAMPTZ NULL,
  last_result public.recall_result NULL,
  last_confidence INTEGER NULL,
  
  -- Contadores
  attempt_count INTEGER NOT NULL DEFAULT 0,
  successful_recalls INTEGER NOT NULL DEFAULT 0,
  failed_recalls INTEGER NOT NULL DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, concept_id)
);

-- Grants e RLS para memory_states
GRANT SELECT, INSERT, UPDATE ON public.memory_states TO authenticated;
GRANT ALL ON public.memory_states TO service_role;
ALTER TABLE public.memory_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_states_owner_access" ON public.memory_states
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Vínculos Adicionais
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='concept_id') THEN
    ALTER TABLE public.flashcards ADD COLUMN concept_id UUID NULL REFERENCES public.concepts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Função Centralizada de Atualização (V1 - Lógica Básica)
CREATE OR REPLACE FUNCTION public.apply_evidence_to_memory_state(
  p_concept_id UUID,
  p_evidence_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Necessário para garantir consistência e acesso a múltiplas tabelas
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result public.recall_result;
  v_confidence INTEGER;
  v_attempted_at TIMESTAMPTZ;
  v_state_id UUID;
  v_is_success BOOLEAN;
BEGIN
  -- 1. Obter dados da evidência
  SELECT user_id, result, confidence, attempted_at 
  INTO v_user_id, v_result, v_confidence, v_attempted_at
  FROM public.cognitive_evidences
  WHERE id = p_evidence_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evidência não encontrada' USING ERRCODE = '42704';
  END IF;

  -- 2. Determinar se foi sucesso (Regra V1)
  v_is_success := v_result IN ('correct', 'self_reported_correct');

  -- 3. Upsert no memory_state
  INSERT INTO public.memory_states (
    user_id, concept_id, strength, stability, difficulty,
    last_recalled_at, last_result, last_confidence,
    attempt_count, successful_recalls, failed_recalls, updated_at
  )
  VALUES (
    v_user_id, p_concept_id, 
    CASE WHEN v_is_success THEN 0.5 ELSE 0.1 END, -- Strength V1 Placeholder
    1.0, -- Stability V1 Placeholder (1 dia)
    3.0, -- Difficulty V1 Placeholder (Médio)
    v_attempted_at, v_result, v_confidence,
    1, CASE WHEN v_is_success THEN 1 ELSE 0 END, CASE WHEN v_is_success THEN 0 ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id, concept_id) DO UPDATE SET
    last_recalled_at = v_attempted_at,
    last_result = v_result,
    last_confidence = v_confidence,
    attempt_count = memory_states.attempt_count + 1,
    successful_recalls = memory_states.successful_recalls + (CASE WHEN v_is_success THEN 1 ELSE 0 END),
    failed_recalls = memory_states.failed_recalls + (CASE WHEN v_is_success THEN 0 ELSE 1 END),
    updated_at = now()
  RETURNING id INTO v_state_id;

  RETURN v_state_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_evidence_to_memory_state TO authenticated;

-- 5. Trigger para atualizar automaticante (Opcional, mas garante integridade V1)
CREATE OR REPLACE FUNCTION public.on_cognitive_evidence_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.concept_id IS NOT NULL THEN
    PERFORM public.apply_evidence_to_memory_state(NEW.concept_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_memory_on_evidence
AFTER INSERT ON public.cognitive_evidences
FOR EACH ROW EXECUTE FUNCTION public.on_cognitive_evidence_insert();
