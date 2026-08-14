-- 1. Remove sessões "Livre · 0 min" que parecem ter sido geradas erroneamente
DELETE FROM public.study_sessions
WHERE ended_at IS NULL 
  AND duration_seconds IS NULL 
  AND lesson_id IS NULL;

-- 2. Limpeza de dados de teste 'sfsd' se existirem
DELETE FROM public.courses WHERE name ILIKE '%sfsd%' OR name ILIKE '%teste%';
DELETE FROM public.lessons WHERE title ILIKE '%sfsd%' OR title ILIKE '%teste%';
