-- 1) Preservar histórico cognitivo quando um conceito é excluído
ALTER TABLE public.cognitive_evidences
  DROP CONSTRAINT cognitive_evidences_concept_id_fkey;
ALTER TABLE public.cognitive_evidences
  ADD CONSTRAINT cognitive_evidences_concept_id_fkey
  FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON DELETE SET NULL;

-- 2) Índices de integridade/performance para a cadeia cognitiva
CREATE INDEX IF NOT EXISTS concepts_user_id_idx ON public.concepts (user_id);
CREATE INDEX IF NOT EXISTS concepts_lesson_id_idx ON public.concepts (lesson_id);
CREATE INDEX IF NOT EXISTS concepts_user_active_idx ON public.concepts (user_id, is_archived);

CREATE INDEX IF NOT EXISTS memory_states_user_due_idx ON public.memory_states (user_id, due);
CREATE INDEX IF NOT EXISTS memory_states_concept_id_idx ON public.memory_states (concept_id);

CREATE INDEX IF NOT EXISTS cognitive_evidences_user_concept_idx ON public.cognitive_evidences (user_id, concept_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS cognitive_evidences_session_id_idx ON public.cognitive_evidences (session_id);

CREATE INDEX IF NOT EXISTS questions_concept_id_idx ON public.questions (concept_id);
CREATE INDEX IF NOT EXISTS study_sessions_lesson_id_idx ON public.study_sessions (lesson_id);
CREATE INDEX IF NOT EXISTS lesson_documents_published_idx ON public.lesson_documents (lesson_id, published_version);