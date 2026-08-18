-- questions.concept_id existe desde 20260815183535 (usada por
-- record_recall_attempt para gravar qual concept uma cognitive_evidence
-- avalia) mas nunca ganhou FK — nada no app grava esta coluna até hoje.
-- A Escrita Livre do curso está prestes a ser o primeiro escritor real
-- dela, então a integridade referencial passa a importar de verdade.
--
-- PRÉ-VOO obrigatório antes de rodar este arquivo:
--   SELECT count(*) FROM public.questions WHERE concept_id IS NOT NULL;
-- Esperado: 0 (confirmado por grep: nenhum código já escreveu esta
-- coluna). Se retornar > 0, NÃO rode o ADD CONSTRAINT abaixo direto —
-- troque por NOT VALID + VALIDATE CONSTRAINT em separado.

ALTER TABLE public.questions
  ADD CONSTRAINT questions_concept_user_fkey
  FOREIGN KEY (concept_id, user_id)
  REFERENCES public.concepts(id, user_id)
  ON DELETE SET NULL (concept_id);

CREATE INDEX questions_concept_id_idx ON public.questions (concept_id);
