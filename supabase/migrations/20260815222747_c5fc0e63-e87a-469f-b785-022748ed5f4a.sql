
-- Adicionando flag is_test_data para isolamento estrutural
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.concepts ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.memory_states ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cognitive_evidences ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.planned_studies ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;

-- Grants para authenticated e service_role (anon geralmente não precisa desse campo ou é read-only)
GRANT ALL ON TABLE public.courses TO authenticated, service_role;
GRANT ALL ON TABLE public.course_modules TO authenticated, service_role;
GRANT ALL ON TABLE public.lessons TO authenticated, service_role;
GRANT ALL ON TABLE public.concepts TO authenticated, service_role;
GRANT ALL ON TABLE public.flashcards TO authenticated, service_role;
GRANT ALL ON TABLE public.questions TO authenticated, service_role;
GRANT ALL ON TABLE public.study_sessions TO authenticated, service_role;
GRANT ALL ON TABLE public.memory_states TO authenticated, service_role;
GRANT ALL ON TABLE public.cognitive_evidences TO authenticated, service_role;
GRANT ALL ON TABLE public.planned_studies TO authenticated, service_role;
GRANT ALL ON TABLE public.decks TO authenticated, service_role;

-- Seeding inicial: Marcar os dados de auditoria existentes (operação única e segura)
-- Usamos os títulos conhecidos APENAS para esta transição estrutural
UPDATE public.courses SET is_test_data = TRUE WHERE name ILIKE 'Audit %' OR name ILIKE 'Test %';
UPDATE public.lessons SET is_test_data = TRUE WHERE title ILIKE 'Audit %' OR title ILIKE 'Test %';
UPDATE public.course_modules SET is_test_data = TRUE WHERE name ILIKE 'Audit %' OR name ILIKE 'Test %';

-- Propagação para sessões e estados baseados nas aulas/cursos marcados
UPDATE public.study_sessions ss 
SET is_test_data = TRUE 
FROM public.lessons l 
WHERE ss.lesson_id = l.id AND l.is_test_data = TRUE;

UPDATE public.concepts c 
SET is_test_data = TRUE 
FROM public.lessons l 
WHERE c.lesson_id = l.id AND l.is_test_data = TRUE;

UPDATE public.memory_states ms 
SET is_test_data = TRUE 
FROM public.concepts c 
WHERE ms.concept_id = c.id AND c.is_test_data = TRUE;

UPDATE public.cognitive_evidences ce 
SET is_test_data = TRUE 
FROM public.concepts c 
WHERE ce.concept_id = c.id AND c.is_test_data = TRUE;

UPDATE public.flashcards f 
SET is_test_data = TRUE 
FROM public.lessons l 
WHERE f.lesson_id = l.id AND l.is_test_data = TRUE;
