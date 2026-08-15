-- 1. Auditar e adaptar memory_states para suportar FSRS v4
ALTER TABLE public.memory_states 
ADD COLUMN IF NOT EXISTS stability float8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS difficulty float8 DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS due timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_review timestamptz,
ADD COLUMN IF NOT EXISTS reps int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS lapses int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS state int2 DEFAULT 0, -- 0: New, 1: Learning, 2: Review, 3: Relearning
ADD COLUMN IF NOT EXISTS scheduled_days int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS elapsed_days int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS algorithm_version text DEFAULT 'fsrs_v4',
ADD COLUMN IF NOT EXISTS algorithm_name text DEFAULT 'fsrs';

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_states TO authenticated;
GRANT ALL ON public.memory_states TO service_role;

-- 3. Adicionar colunas extras para metadados cognitivos se não existirem
ALTER TABLE public.cognitive_evidences
ADD COLUMN IF NOT EXISTS confidence_mismatch boolean DEFAULT false;

-- 4. Função para reconstruir estado FSRS (Placeholder para ser atualizado pela RPC/Engine)
CREATE OR REPLACE FUNCTION public.rebuild_memory_state_from_history(p_concept_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.memory_states (user_id, concept_id)
    VALUES (p_user_id, p_concept_id)
    ON CONFLICT (user_id, concept_id) DO NOTHING;
    
    RETURN (SELECT id FROM public.memory_states WHERE user_id = p_user_id AND concept_id = p_concept_id);
END;
$$;