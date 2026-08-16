-- Relação explícita aula -> curso (a coluna existia sem FK própria,
-- quebrando a leitura hierárquica do mapa de domínio)
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_course_user_fkey
  FOREIGN KEY (course_id, user_id) REFERENCES public.courses(id, user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS lessons_course_user_idx ON public.lessons (course_id, user_id);