DELETE FROM public.cognitive_evidences ce
WHERE ce.concept_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = ce.concept_id);

ALTER TABLE public.cognitive_evidences
  ADD CONSTRAINT cognitive_evidences_concept_id_fkey
  FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cognitive_evidences_concept_id
  ON public.cognitive_evidences(concept_id);