-- flashcards e questions ganham course_id, sibling de lesson_id — mesmo
-- padrão "avulso quando ambos NULL" já usado para lesson_id (Fase 04/05.1):
-- um flashcard/questão criado na Escrita Livre de um curso não pertence a
-- nenhuma aula, mas não é avulso — pertence ao curso.

ALTER TABLE public.flashcards
  ADD COLUMN course_id UUID NULL;

ALTER TABLE public.questions
  ADD COLUMN course_id UUID NULL;

-- Nunca as duas âncoras ao mesmo tempo (mas pode ter nenhuma — "avulso"
-- continua válido, ao contrário de concepts).
ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_not_both_anchors_check
  CHECK (lesson_id IS NULL OR course_id IS NULL);

ALTER TABLE public.questions
  ADD CONSTRAINT questions_not_both_anchors_check
  CHECK (lesson_id IS NULL OR course_id IS NULL);

-- Mesma proteção multi-tenant de flashcards_lesson_user_fkey/
-- questions_lesson_user_fkey: só pode apontar para um curso do MESMO
-- user_id. ON DELETE SET NULL só na coluna course_id — apagar o curso
-- desvincula o cartão/questão, não apaga (mesma semântica de lesson_id
-- nestas duas tabelas).
ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_course_user_fkey
  FOREIGN KEY (course_id, user_id)
  REFERENCES public.courses(id, user_id)
  ON DELETE SET NULL (course_id);

ALTER TABLE public.questions
  ADD CONSTRAINT questions_course_user_fkey
  FOREIGN KEY (course_id, user_id)
  REFERENCES public.courses(id, user_id)
  ON DELETE SET NULL (course_id);

CREATE INDEX flashcards_course_active_idx
  ON public.flashcards (user_id, course_id)
  WHERE is_archived = false;

CREATE INDEX questions_course_active_idx
  ON public.questions (user_id, course_id)
  WHERE is_archived = false;
