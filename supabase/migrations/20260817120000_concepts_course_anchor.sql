-- Concept ganha um segundo tipo de âncora: course_id, sibling de lesson_id
-- — mesmo padrão já usado em lesson_documents (20260816230000) e em
-- flashcards/questions (lesson_id NULL = avulso). Aqui não existe "avulso":
-- um concept sem NENHUMA âncora não faz sentido no Domain Model
-- (Study Area -> Courses -> Lessons/Concepts -> Memory States), então o
-- CHECK exige exatamente uma das duas.
--
-- Tabela concepts está vazia em produção (nenhum INSERT INTO concepts em
-- todo o histórico de migrations/app — o pipeline Concept -> Cognitive
-- Evidence -> Memory State -> FSRS nunca foi acionado por nada até agora),
-- então o CHECK "exatamente uma âncora" e a UNIQUE(id, user_id) nova são
-- seguros de adicionar sem qualquer migração de dados.

ALTER TABLE public.concepts
  ADD COLUMN course_id UUID NULL;

ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_exactly_one_anchor_check
  CHECK ((lesson_id IS NOT NULL) <> (course_id IS NOT NULL));

-- Suporte à FK composta filha (memory_states já referencia concepts por id
-- simples; esta chave é para o novo vínculo concepts -> courses abaixo).
ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_id_user_id_key UNIQUE (id, user_id);

-- Mesma proteção multi-tenant já usada para lesson_documents.course_id:
-- o concept só pode apontar para um curso do MESMO user_id
-- (courses_id_user_id_key já existe desde a Fase 02.2/06.1).
ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_course_user_fkey
  FOREIGN KEY (course_id, user_id)
  REFERENCES public.courses(id, user_id)
  ON DELETE CASCADE;

CREATE INDEX concepts_course_id_idx ON public.concepts (course_id);

-- concepts.lesson_id tinha uma FK simples (sem user_id, sem CASCADE) desde
-- a criação da tabela — SET NULL fazia sentido quando concept podia ficar
-- sem NENHUMA âncora. Com o CHECK acima exigindo exatamente uma âncora,
-- SET NULL passaria a violar o CHECK assim que a primeira aula com
-- concepts fosse apagada (lesson_id viraria NULL com course_id já NULL).
-- Troca para composta + CASCADE, simétrica ao tratamento de course_id
-- acima: apagar a aula (ou o curso) apaga os concepts que só existem por
-- causa dela — mesma semântica de "o dono morreu, a evidência cognitiva
-- vinculada some com ele" já aceita para memory_states/cognitive_evidences
-- (que fazem CASCADE a partir de concepts).
ALTER TABLE public.concepts
  DROP CONSTRAINT IF EXISTS concepts_lesson_id_fkey;

ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_lesson_user_fkey
  FOREIGN KEY (lesson_id, user_id)
  REFERENCES public.lessons(id, user_id)
  ON DELETE CASCADE;
