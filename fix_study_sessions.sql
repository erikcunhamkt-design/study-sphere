-- 1. Remove sessões "Livre · 0 min" que parecem ter sido geradas erroneamente
-- Elas têm duration_seconds IS NULL e ended_at IS NULL, indicando que nunca foram concluídas.
-- Vamos deletar sessões que possuem essas características e que não possuem lesson_id associado.
DELETE FROM public.study_sessions
WHERE ended_at IS NULL 
  AND duration_seconds IS NULL 
  AND lesson_id IS NULL;

-- 2. Limpeza de dados de teste 'sfsd' se existirem (embora não tenha aparecido na query, vamos garantir)
-- Verifica se há cursos ou lições com nomes contendo 'sfsd' ou 'teste'
-- Para cursos:
DELETE FROM public.courses WHERE name ILIKE '%sfsd%' OR name ILIKE '%teste%';
-- Para lições (cascata deletará registros relacionados):
DELETE FROM public.lessons WHERE title ILIKE '%sfsd%' OR title ILIKE '%teste%';
